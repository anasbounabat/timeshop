// Toutes les requêtes HTTP du front vers les APIs passent par ce fichier.
// Les pages n'appellent jamais fetch() directement : elles utilisent window.api.
//
// Convention des services : succès -> { data: ... }, échec -> { error: { message, details? } }

(function () {
  // Retire un éventuel "/" final pour éviter les URLs du type "...3001//api".
  const trim = (url) => url.replace(/\/+$/, '');
  const PRODUCT_URL = trim(window.TIMESHOP_CONFIG.PRODUCT_SERVICE_URL);

  // Erreur enrichie : status = code HTTP (0 si le serveur est injoignable),
  // details = informations renvoyées par l'API (ex : articles en rupture).
  class ApiError extends Error {
    constructor(message, status, details) {
      super(message);
      this.status = status;
      this.details = details;
    }
  }

  // Fonction générique : envoie la requête, décode le JSON, gère les erreurs.
  async function request(url, { method = 'GET', body } = {}) {
    const options = { method, headers: { Accept: 'application/json' } };
    if (body !== undefined) {
      // Content-Type uniquement quand il y a un corps (évite un preflight CORS inutile sur les GET).
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    let response;
    try {
      response = await fetch(url, options);
    } catch {
      // fetch ne rejette que sur une erreur réseau (service arrêté, CORS, hors ligne).
      throw new ApiError(
        'Impossible de contacter le serveur. Vérifiez que les services sont démarrés.',
        0
      );
    }

    // Le corps peut être vide ou invalide : on ne plante pas pour autant.
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new ApiError(
        payload?.error?.message || `Erreur inattendue (${response.status})`,
        response.status,
        payload?.error?.details
      );
    }
    return payload?.data;
  }

  // API publique utilisée par catalog.js et product.js.
  window.api = {
    ApiError,

    // Liste des montres, filtrée par marque si "brand" est fourni.
    getProducts(brand) {
      const query = brand ? `?brand=${encodeURIComponent(brand)}` : '';
      return request(`${PRODUCT_URL}/api/products${query}`);
    },

    getProduct(id) {
      return request(`${PRODUCT_URL}/api/products/${encodeURIComponent(id)}`);
    },
  };
})();
