// Formatage des prix en euros, partagé par toutes les pages.
// Utilisable dans le HTML : x-text="$price(product.price)"

const priceFormatter = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });

// "alpine:init" est déclenché par Alpine juste avant d'initialiser la page :
// c'est le bon moment pour déclarer un helper global ("magic").
document.addEventListener('alpine:init', () => {
  Alpine.magic('price', () => (value) => priceFormatter.format(value ?? 0));
});
