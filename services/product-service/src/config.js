// Centralise la lecture de la configuration (variables d'environnement).
// Aucun chemin ni port n'est écrit en dur dans le code : tout vient du .env
// en local, ou des variables d'environnement du conteneur plus tard.

// Charge le fichier .env (s'il existe) dans process.env.
// "quiet" évite le message d'information affiché par dotenv au démarrage.
require('dotenv').config({ quiet: true });

// Lit une variable obligatoire : on préfère planter au démarrage avec un
// message clair plutôt que de tourner avec une configuration incomplète.
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

module.exports = {
  serviceName: 'product-service',
  port,
  dbPath: required('DB_PATH'),
  // "*" ou liste d'origines séparées par des virgules -> tableau pour cors()
  corsOrigin: (process.env.CORS_ORIGIN || '*').trim() === '*'
    ? '*'
    : process.env.CORS_ORIGIN.split(',').map((o) => o.trim()),
};
