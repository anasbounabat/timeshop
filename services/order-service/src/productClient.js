// Client HTTP vers le product-service.
//
// L'order-service ne lit JAMAIS la base des produits directement : chaque
// microservice possède ses données et les autres passent par son API.
// On utilise fetch, intégré à Node.js depuis la version 18.

const config = require('./config');
const { HttpError } = require('./errors');

// Effectue l'appel HTTP et renvoie { status, body }.
// Une panne réseau ou un délai dépassé devient une 503 (service indisponible).
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${config.productServiceUrl}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      // Coupe l'appel si product-service ne répond pas à temps.
      signal: AbortSignal.timeout(config.requestTimeoutMs),
    });
  } catch (err) {
    console.error(`[productClient] ${path} : ${err.message}`);
    throw new HttpError(503, 'Le service produits est momentanément indisponible');
  }
  // Le corps peut être vide ou non-JSON en cas de gros problème : on reste tolérant.
  const body = await response.json().catch(() => null);
  return { status: response.status, body };
}

// Récupère un produit. Renvoie null s'il n'existe pas (404).
async function getProduct(id) {
  const { status, body } = await request(`/api/products/${id}`);
  if (status === 404) return null;
  if (status !== 200 || !body?.data) {
    throw new HttpError(502, 'Réponse inattendue du service produits');
  }
  return body.data;
}

// Ajuste le stock d'un produit de "delta" (négatif = décrément).
// Renvoie { ok: true, product } ou { ok: false, reason: 'insufficient' | 'not_found' }.
async function adjustStock(id, delta) {
  const { status, body } = await request(`/api/products/${id}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ delta }),
  });
  if (status === 200) return { ok: true, product: body.data };
  if (status === 409) return { ok: false, reason: 'insufficient' };
  if (status === 404) return { ok: false, reason: 'not_found' };
  throw new HttpError(502, 'Réponse inattendue du service produits');
}

module.exports = { getProduct, adjustStock };
