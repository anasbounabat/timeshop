// Routes de l'API commandes, montées sur /api/orders dans index.js.

const express = require('express');
const db = require('../db');
const productClient = require('../productClient');
const { HttpError } = require('../errors');

const router = express.Router();

// Format d'email volontairement simple (la vraie vérification = envoyer un mail).
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_ITEMS = 50;      // lignes différentes max par commande
const MAX_QUANTITY = 100;  // quantité max par ligne

// ---------- Validation ----------

// Valide { customer: {name, email}, items: [{productId, quantity}] }.
// Renvoie les données nettoyées, ou lève une 400 avec la liste des erreurs.
function validateOrder(body) {
  const errors = [];
  const { customer, items } = body ?? {};

  const name = typeof customer?.name === 'string' ? customer.name.trim() : '';
  const email = typeof customer?.email === 'string' ? customer.email.trim().toLowerCase() : '';
  if (name.length === 0 || name.length > 100) errors.push('customer.name : texte requis (100 caractères max)');
  if (!EMAIL_REGEX.test(email) || email.length > 254) errors.push('customer.email : email valide requis');

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items : tableau non vide requis');
  } else if (items.length > MAX_ITEMS) {
    errors.push(`items : ${MAX_ITEMS} lignes maximum`);
  } else {
    items.forEach((item, i) => {
      if (!Number.isInteger(item?.productId) || item.productId <= 0) {
        errors.push(`items[${i}].productId : entier positif requis`);
      }
      if (!Number.isInteger(item?.quantity) || item.quantity < 1 || item.quantity > MAX_QUANTITY) {
        errors.push(`items[${i}].quantity : entier entre 1 et ${MAX_QUANTITY} requis`);
      }
    });
  }

  if (errors.length > 0) throw new HttpError(400, 'Commande invalide', errors);

  // Fusionne les doublons : [{id:1,q:1},{id:1,q:2}] -> [{id:1,q:3}]
  // Sinon on vérifierait le stock deux fois séparément pour le même produit.
  const merged = new Map();
  for (const { productId, quantity } of items) {
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  // NB : un éventuel champ "price" envoyé par le client est simplement ignoré.
  return {
    customer: { name, email },
    items: [...merged].map(([productId, quantity]) => ({ productId, quantity })),
  };
}

// Remet en stock ce qui a déjà été décrémenté (compensation).
// Sans transaction distribuée entre deux services, c'est la façon standard
// d'annuler une opération partiellement réalisée (pattern "saga").
async function restoreStock(decremented) {
  for (const { productId, quantity } of decremented) {
    try {
      await productClient.adjustStock(productId, quantity);
    } catch (err) {
      // Best effort : on journalise pour correction manuelle.
      console.error(`[orders] Échec de remise en stock produit ${productId} (+${quantity}) :`, err.message);
    }
  }
}

// ---------- Routes ----------

// POST /api/orders -> crée une commande (201), ou 400 / 404 / 409 / 503
router.post('/', async (req, res) => {
  const { customer, items } = validateOrder(req.body);

  // 1) Récupère le VRAI produit (prix, stock) auprès de product-service,
  //    en parallèle pour aller plus vite.
  const products = await Promise.all(items.map((i) => productClient.getProduct(i.productId)));

  const missing = items.filter((_, idx) => products[idx] === null).map((i) => i.productId);
  if (missing.length > 0) {
    throw new HttpError(404, 'Produit(s) introuvable(s)', { productIds: missing });
  }

  // 2) Vérifie le stock de chaque ligne et liste tous les problèmes d'un coup.
  const shortages = items
    .map((item, idx) => ({ item, product: products[idx] }))
    .filter(({ item, product }) => product.stock < item.quantity)
    .map(({ item, product }) => ({
      productId: product.id,
      name: product.name,
      requested: item.quantity,
      available: product.stock,
    }));
  if (shortages.length > 0) {
    throw new HttpError(409, 'Stock insuffisant pour certains articles', shortages);
  }

  // 3) Construit les lignes avec le prix du catalogue (jamais celui du client)
  //    et calcule le total en centimes pour éviter les erreurs d'arrondi
  //    des nombres à virgule (0.1 + 0.2 !== 0.3 en JavaScript).
  const lines = items.map((item, idx) => ({
    productId: item.productId,
    name: products[idx].name,
    unitPrice: products[idx].price,
    quantity: item.quantity,
  }));
  const totalCents = lines.reduce((sum, l) => sum + Math.round(l.unitPrice * 100) * l.quantity, 0);
  const total = totalCents / 100;

  // 4) Décrémente le stock produit par produit. Le product-service fait un
  //    décrément atomique : si quelqu'un a acheté entre l'étape 2 et maintenant,
  //    il répond 409 et on annule ce qui a déjà été décrémenté.
  const decremented = [];
  try {
    for (const line of lines) {
      const result = await productClient.adjustStock(line.productId, -line.quantity);
      if (!result.ok) {
        throw new HttpError(
          result.reason === 'insufficient' ? 409 : 404,
          result.reason === 'insufficient'
            ? `Stock insuffisant pour « ${line.name} » (vient d'être acheté par un autre client)`
            : `Produit introuvable : ${line.productId}`,
          [{ productId: line.productId, name: line.name, requested: line.quantity }]
        );
      }
      decremented.push({ productId: line.productId, quantity: line.quantity });
    }

    // 5) Enregistre la commande dans la base de l'order-service.
    const order = await db.createOrder({ customer, items: lines, total });
    res.status(201).json({ data: order });
  } catch (err) {
    // Échec à l'étape 4 ou 5 : on rend le stock déjà réservé, puis on
    // relance l'erreur pour que le middleware renvoie le bon code HTTP.
    await restoreStock(decremented);
    throw err;
  }
});

// GET /api/orders/:id -> détail d'une commande, ou 404
router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "L'identifiant doit être un entier positif");
  }
  const order = await db.findById(id);
  if (!order) throw new HttpError(404, 'Commande introuvable');
  res.json({ data: order });
});

module.exports = router;
