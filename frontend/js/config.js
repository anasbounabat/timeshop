// Configuration du front : URLs de base des microservices.
//
// C'est le seul endroit où ces URLs apparaissent. Un site statique ne peut pas
// lire de variables d'environnement : une fois conteneurisé, ce fichier pourra
// être généré au démarrage du conteneur (ex : envsubst) à partir de variables
// PRODUCT_SERVICE_URL.
window.TIMESHOP_CONFIG = {
  PRODUCT_SERVICE_URL: 'http://localhost:3001',
};
