// Erreur "métier" portant un code HTTP. Les routes la lancent (throw) et le
// middleware de gestion d'erreurs (index.js) la transforme en réponse JSON.
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;   // code HTTP à renvoyer (400, 404, 409...)
    this.details = details; // informations complémentaires optionnelles
  }
}

module.exports = { HttpError };
