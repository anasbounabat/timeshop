// Couche d'accès aux données des commandes.
//
// Seul fichier qui connaît SQLite. Toutes les fonctions sont asynchrones pour
// pouvoir remplacer better-sqlite3 par PostgreSQL ("pg") sans toucher aux routes.
//
// Modèle : une commande (orders) possède plusieurs lignes (order_items).
// On copie le nom et le prix du produit dans chaque ligne : la commande reste
// juste même si le prix du catalogue change plus tard.

const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');
const config = require('./config');

let db = null;

async function init() {
  fs.mkdirSync(path.dirname(path.resolve(config.dbPath)), { recursive: true });

  db = new Database(config.dbPath);
  db.pragma('journal_mode = WAL');
  // SQLite n'applique les clés étrangères que si on l'active explicitement.
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name  TEXT    NOT NULL,
      customer_email TEXT    NOT NULL,
      total          REAL    NOT NULL CHECK (total >= 0),
      status         TEXT    NOT NULL DEFAULT 'confirmed',
      created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS order_items (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id     INTEGER NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
      product_id   INTEGER NOT NULL,
      product_name TEXT    NOT NULL,
      unit_price   REAL    NOT NULL CHECK (unit_price > 0),
      quantity     INTEGER NOT NULL CHECK (quantity > 0)
    );
    CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items (order_id);
  `);
}

async function ping() {
  db.prepare('SELECT 1').get();
}

// Assemble la commande et ses lignes au format JSON de l'API.
function toOrder(orderRow, itemRows) {
  return {
    id: orderRow.id,
    customer: { name: orderRow.customer_name, email: orderRow.customer_email },
    items: itemRows.map((r) => ({
      productId: r.product_id,
      name: r.product_name,
      unitPrice: r.unit_price,
      quantity: r.quantity,
      lineTotal: Math.round(r.unit_price * r.quantity * 100) / 100,
    })),
    total: orderRow.total,
    status: orderRow.status,
    createdAt: orderRow.created_at,
  };
}

async function findById(id) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);
  if (!order) return null;
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(id);
  return toOrder(order, items);
}

// Enregistre la commande ET ses lignes dans une transaction :
// soit tout est écrit, soit rien (pas de commande sans lignes).
async function createOrder({ customer, items, total }) {
  const insertOrder = db.prepare(
    'INSERT INTO orders (customer_name, customer_email, total) VALUES (?, ?, ?)'
  );
  const insertItem = db.prepare(
    `INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity)
     VALUES (?, ?, ?, ?, ?)`
  );

  const orderId = db.transaction(() => {
    const { lastInsertRowid } = insertOrder.run(customer.name, customer.email, total);
    for (const item of items) {
      insertItem.run(lastInsertRowid, item.productId, item.name, item.unitPrice, item.quantity);
    }
    return lastInsertRowid;
  })();

  return findById(orderId);
}

async function close() {
  if (db) db.close();
  db = null;
}

module.exports = { init, ping, findById, createOrder, close };
