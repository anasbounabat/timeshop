// Couche d'accès aux données du catalogue.
//
// C'est le SEUL fichier qui connaît SQLite. Les routes n'appellent que les
// fonctions exportées ci-dessous, qui sont toutes asynchrones (elles renvoient
// une Promise) même si better-sqlite3 est synchrone : le jour où l'on passe à
// PostgreSQL (client "pg", lui asynchrone), il suffira de réécrire ce fichier
// sans toucher aux routes.

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const config = require('./config');

let db = null; // connexion ouverte par init()

// Convertit une ligne SQL (snake_case) en objet JSON exposé par l'API (camelCase).
function toProduct(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    price: row.price,
    image: row.image,
    description: row.description,
    stock: row.stock,
    createdAt: row.created_at,
  };
}

// Ouvre la base et crée la table si elle n'existe pas encore.
async function init() {
  // Crée le dossier qui contient le fichier .db (ex: ./data) s'il manque.
  fs.mkdirSync(path.dirname(path.resolve(config.dbPath)), { recursive: true });

  db = new Database(config.dbPath);
  // WAL : meilleures performances en lecture/écriture concurrentes.
  db.pragma('journal_mode = WAL');

  // Les CHECK garantissent l'intégrité même si une route oubliait une validation :
  // un stock ne peut jamais devenir négatif, un prix doit être positif.
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      brand       TEXT    NOT NULL,
      price       REAL    NOT NULL CHECK (price > 0),
      image       TEXT    NOT NULL,
      description TEXT    NOT NULL DEFAULT '',
      stock       INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_products_brand ON products (brand COLLATE NOCASE);
  `);
}

// Vérifie que la base répond (utilisé par GET /health).
async function ping() {
  db.prepare('SELECT 1').get();
}

// Liste les produits, avec filtre optionnel sur la marque (insensible à la casse).
async function findAll({ brand } = {}) {
  // Requêtes préparées avec "?" : les valeurs ne sont jamais concaténées
  // dans le SQL, ce qui empêche toute injection SQL.
  const rows = brand
    ? db.prepare('SELECT * FROM products WHERE brand = ? COLLATE NOCASE ORDER BY id').all(brand)
    : db.prepare('SELECT * FROM products ORDER BY id').all();
  return rows.map(toProduct);
}

async function findById(id) {
  return toProduct(db.prepare('SELECT * FROM products WHERE id = ?').get(id));
}

async function count() {
  return db.prepare('SELECT COUNT(*) AS n FROM products').get().n;
}

// Insère un produit et renvoie la ligne créée (avec son id et sa date).
async function create({ name, brand, price, image, description = '', stock = 0 }) {
  const result = db
    .prepare(
      `INSERT INTO products (name, brand, price, image, description, stock)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(name, brand, price, image, description, stock);
  return findById(result.lastInsertRowid);
}

// Ajoute "delta" au stock (négatif pour décrémenter) de façon ATOMIQUE :
// la condition "stock + delta >= 0" est vérifiée dans la même requête UPDATE.
// Deux commandes simultanées ne peuvent donc pas vendre la même dernière montre.
// Renvoie le produit mis à jour, ou null si le stock est insuffisant.
async function adjustStock(id, delta) {
  const result = db
    .prepare('UPDATE products SET stock = stock + ? WHERE id = ? AND stock + ? >= 0')
    .run(delta, id, delta);
  return result.changes === 1 ? findById(id) : null;
}

// Fixe le stock à une valeur absolue (réassort, inventaire).
async function setStock(id, stock) {
  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, id);
  return findById(id);
}

// Vide la table (utilisé par le script de seed).
async function deleteAll() {
  db.exec("DELETE FROM products; DELETE FROM sqlite_sequence WHERE name = 'products';");
}

// Insère plusieurs produits dans une seule transaction (tout ou rien).
async function createMany(products) {
  const insert = db.prepare(
    `INSERT INTO products (name, brand, price, image, description, stock)
     VALUES (@name, @brand, @price, @image, @description, @stock)`
  );
  db.transaction((list) => list.forEach((p) => insert.run(p)))(products);
}

async function close() {
  if (db) db.close();
  db = null;
}

module.exports = {
  init,
  ping,
  findAll,
  findById,
  count,
  create,
  createMany,
  adjustStock,
  setStock,
  deleteAll,
  close,
};
