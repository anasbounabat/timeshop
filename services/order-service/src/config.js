// Centralise la lecture de la configuration (variables d'environnement).
// Aucun chemin, port ni URL n'est écrit en dur dans le code.

// Charge le fichier .env (s'il existe) dans process.env.
require('dotenv').config({ quiet: true });

// Lit une variable obligatoire, ou arrête le service avec un message clair.
function required(name) {
  const value = process.env[name];
  if (value === undefined || value.trim() === '') {
    console.error(`[config] Variable d'environnement manquante : ${name} (voir .env.example)`);
    process.exit(1);
  }
  return value.trim();
}

const port = Number(required('PORT'));
if (!Number.isInteger(port) || port <= 0 || port > 65535) {
  console.error('[config] PORT doit être un entier entre 1 et 65535');
  process.exit(1);
}

const requestTimeoutMs = Number(process.env.REQUEST_TIMEOUT_MS || 5000);

module.exports = {
  serviceName: 'order-service',
  port,
  dbPath: required('DB_PATH'),
  // On retire un éventuel "/" final pour pouvoir concaténer "/api/..." sans doublon.
  productServiceUrl: required('PRODUCT_SERVICE_URL').replace(/\/+$/, ''),
  requestTimeoutMs: Number.isFinite(requestTimeoutMs) && requestTimeoutMs > 0 ? requestTimeoutMs : 5000,
  corsOrigin: (process.env.CORS_ORIGIN || '*').trim() === '*'
    ? '*'
    : process.env.CORS_ORIGIN.split(',').map((o) => o.trim()),
};
