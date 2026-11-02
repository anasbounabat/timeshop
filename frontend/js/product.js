// Composant Alpine de la page détail (product.html?id=3).
//
// Au chargement : lit l'id dans l'URL, demande la montre à l'API produits,
// puis charge 3 suggestions. Les états (chargement, erreur, détail) sont
// affichés par product.html selon les valeurs ci-dessous.

function productPage() {
  return {
    product: null,  // la montre affichée (null tant qu'elle n'est pas chargée)
    related: [],   // suggestions "Vous aimerez aussi"
    loading: true,  // vrai pendant l'appel à l'API
    error: null,    // message affiché si quelque chose échoue

    // Appelée automatiquement par Alpine au chargement du composant.
    async init() {
      // Lit l'id dans l'URL : product.html?id=3 -> 3
      const id = Number(new URLSearchParams(window.location.search).get('id'));
      if (!Number.isInteger(id) || id <= 0) {
        // Pas d'id (ou id invalide) : inutile d'appeler l'API.
        this.error = 'Aucune montre sélectionnée.';
        this.loading = false;
        return;
      }

      try {
        this.product = await api.getProduct(id);
        document.title = `${this.product.name} — TimeShop`; // titre de l'onglet
        this.loadRelated(); // pas de await : la page s'affiche sans attendre les suggestions
      } catch (err) {
        // 404 : message clair pour l'utilisateur ; sinon message renvoyé par api.js.
        this.error = err.status === 404 ? "Cette montre n'existe pas ou n'est plus disponible." : err.message;
      } finally {
        this.loading = false;
      }
    },

    // 3 suggestions : d'abord la même marque, puis les autres.
    async loadRelated() {
      try {
        // Toutes les montres sauf celle affichée...
        const others = (await api.getProducts()).filter((p) => p.id !== this.product.id);
        const sameBrand = others.filter((p) => p.brand === this.product.brand);
        const otherBrands = others.filter((p) => p.brand !== this.product.brand);
        // ... la même marque en premier, puis les autres, et on garde les 3 premières.
        this.related = [...sameBrand, ...otherBrands].slice(0, 3);
      } catch {
        // Section secondaire : en cas d'erreur, on ne l'affiche simplement pas.
        this.related = [];
      }
    },
  };
}
