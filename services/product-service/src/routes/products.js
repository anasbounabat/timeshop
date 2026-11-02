// Routes de l'API catalogue, montées sur /api/products dans index.js.
// API en lecture seule : on peut lister les montres et en consulter une.
//
// Express 5 transmet automatiquement au middleware d'erreurs toute erreur
// levée dans un handler async : pas besoin de try/catch dans chaque route.
// Toutes les réponses de succès ont la forme { data: ... }.

const express = require('express');
const db = require('../db');
const { HttpError } = require('../errors');

const router = express.Router();

// Convertit le paramètre :id en entier strictement positif, sinon 400.
function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new HttpError(400, "L'identifiant doit être un entier positif");
  }
  return id;
}

// GET /api/products?brand=Nordhorn -> liste (filtrée par marque ou non)
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

module.exports = router;
