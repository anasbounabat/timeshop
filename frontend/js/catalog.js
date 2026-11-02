// Composant Alpine de la page catalogue (index.html).
//
// - Le filtre par marque est fait côté serveur (GET /api/products?brand=).
// - La recherche texte et le tri sont faits côté navigateur sur la liste
//   déjà chargée : instantané, sans requête supplémentaire.

// Met en minuscules et retire les accents : "Méridien" -> "meridien".
// Permet de trouver "meridien" en tapant avec ou sans accent.
function normalize(text) {
  return (text || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

const SORTERS = {
  featured: (a, b) => a.id - b.id,          // ordre du catalogue
  'price-asc': (a, b) => a.price - b.price,
  'price-desc': (a, b) => b.price - a.price,
  name: (a, b) => a.name.localeCompare(b.name, 'fr'),
};

function catalogPage() {
  return {
    products: [],
    brands: [],          // liste des marques pour les filtres
    selectedBrand: '',   // '' = toutes les marques
    search: '',          // texte saisi dans la barre de recherche
    sort: 'featured',    // clé de SORTERS
    loading: true,
    error: null,
    requestId: 0,        // permet d'ignorer une réponse arrivée trop tard

    // Appelée automatiquement par Alpine au chargement du composant.
    async init() {
      await this.load();
    },

    async load() {
      const current = ++this.requestId;
      this.loading = true;
      this.error = null;
      try {
        const products = await api.getProducts(this.selectedBrand);
        // Si l'utilisateur a cliqué sur un autre filtre entre-temps, on jette cette réponse.
        if (current !== this.requestId) return;
        this.products = products;
        // Les marques sont déduites de la liste complète (sans filtre).
        if (!this.selectedBrand) {
          this.brands = [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b));
        }
      } catch (err) {
        if (current === this.requestId) this.error = err.message;
      } finally {
        if (current === this.requestId) this.loading = false;
      }
    },

    // Liste réellement affichée : recherche puis tri.
    // Getter = recalculé automatiquement par Alpine quand search/sort/products changent.
    get visibleProducts() {
      const query = normalize(this.search.trim());
      const filtered = query
        ? this.products.filter((p) => normalize(`${p.name} ${p.brand} ${p.description}`).includes(query))
        : this.products;
      // [...filtered] : on trie une copie pour ne pas modifier this.products.
      return [...filtered].sort(SORTERS[this.sort] || SORTERS.featured);
    },

    get hasActiveFilters() {
      return this.selectedBrand !== '' || this.search.trim() !== '';
    },

    selectBrand(brand) {
      if (brand === this.selectedBrand) return;
      this.selectedBrand = brand;
      this.load();
    },

    resetFilters() {
      this.search = '';
      this.sort = 'featured';
      this.selectBrand('');
    },
  };
}
