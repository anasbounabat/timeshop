// Routes de l'API catalogue, montées sur /api/products dans index.js.
//
// Express 5 transmet automatiquement au middleware d'erreurs toute erreur
// levée dans un handler async : pas besoin de try/catch dans chaque route.
// Toutes les réponses de succès ont la forme { data: ... }.

const express = require('express');
const db = require('../db');
const { HttpError } = require('../errors');

const router = express.Router();

// ---------- Fonctions de validation ----------

// Convertit le paramètre :id en entier strictement positif, sinon 400.
function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "L'identifiant doit être un entier positif");
  }
  return id;
}

function isNonEmptyString(value, maxLength) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Valide le corps de POST /api/products. Renvoie le produit "nettoyé"
// ou lève une 400 listant TOUTES les erreurs (plus pratique pour le client).
function validateProduct(body) {
  const errors = [];
  const { name, brand, price, image, description = '', stock = 0 } = body ?? {};

  if (!isNonEmptyString(name, 120)) errors.push('name : texte requis (120 caractères max)');
  if (!isNonEmptyString(brand, 60)) errors.push('brand : texte requis (60 caractères max)');
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) {
    errors.push('price : nombre strictement positif requis');
  }
  if (typeof image !== 'string' || !isHttpUrl(image)) errors.push('image : URL http(s) requise');
  if (typeof description !== 'string' || description.length > 2000) {
    errors.push('description : texte de 2000 caractères max');
  }
  if (!Number.isInteger(stock) || stock < 0) errors.push('stock : entier positif ou nul requis');

  if (errors.length > 0) throw new HttpError(400, 'Données produit invalides', errors);

  return {
    name: name.trim(),
    brand: brand.trim(),
    price: Math.round(price * 100) / 100, // on garde 2 décimales maximum
    image,
    description: description.trim(),
    stock,
  };
}

// ---------- Routes ----------

// GET /api/products?brand=Nordhorn -> liste (filtrée ou non)
router.get('/', async (req, res) => {
  const { brand } = req.query;
  // ?brand=a&brand=b donne un tableau : on refuse ce cas ambigu.
  if (brand !== undefined && typeof brand !== 'string') {
    throw new HttpError(400, 'Le paramètre brand doit être une chaîne unique');
  }
  const products = await db.findAll({ brand: brand?.trim() || undefined });
  res.json({ data: products });
});

// GET /api/products/:id -> une montre, ou 404
router.get('/:id', async (req, res) => {
  const product = await db.findById(parseId(req.params.id));
  if (!product) throw new HttpError(404, 'Produit introuvable');
  res.json({ data: product });
});

// POST /api/products -> création, 201 + produit créé
router.post('/', async (req, res) => {
  const product = await db.create(validateProduct(req.body));
  res.status(201).json({ data: product });
});

// PATCH /api/products/:id/stock
// Deux formes possibles (exactement une des deux) :
//   { "delta": -2 }  -> ajoute/retire relativement (utilisé par order-service)
//   { "stock": 15 }  -> fixe une valeur absolue (réassort)
// Réponses : 200 produit mis à jour, 400 corps invalide, 404 produit inconnu,
//            409 si le stock deviendrait négatif.
router.patch('/:id/stock', async (req, res) => {
  const id = parseId(req.params.id);
  const { delta, stock } = req.body ?? {};
  const hasDelta = delta !== undefined;
  const hasStock = stock !== undefined;

  if (hasDelta === hasStock) {
    throw new HttpError(400, 'Fournir soit "delta" (entier), soit "stock" (entier >= 0), pas les deux');
  }
  if (hasDelta && (!Number.isInteger(delta) || delta === 0)) {
    throw new HttpError(400, 'delta doit être un entier non nul');
  }
  if (hasStock && (!Number.isInteger(stock) || stock < 0)) {
    throw new HttpError(400, 'stock doit être un entier positif ou nul');
  }

  const existing = await db.findById(id);
  if (!existing) throw new HttpError(404, 'Produit introuvable');

  if (hasStock) {
    return res.json({ data: await db.setStock(id, stock) });
  }

  const updated = await db.adjustStock(id, delta);
  if (!updated) {
    // L'UPDATE conditionnel n'a rien modifié : stock insuffisant.
    throw new HttpError(409, 'Stock insuffisant', {
      productId: id,
      available: existing.stock,
      requested: -delta,
    });
  }
  res.json({ data: updated });
});

module.exports = router;
