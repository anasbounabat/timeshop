// Thème Tailwind partagé par toutes les pages.
// À charger juste APRÈS le script CDN de Tailwind : le CDN lit l'objet
// global "tailwind.config" pour générer les classes personnalisées
// (bg-ink, text-gold, font-display...).
tailwind.config = {
  theme: {
    extend: {
      // Couleurs utilisables en classes : bg-ink, text-gold, text-gold-dark, bg-cream...
      colors: {
        ink: '#0b0b0c',
        cream: '#f7f5f0',
        gold: { DEFAULT: '#c8a24a', light: '#e3c98a', dark: '#9c7a2c' },
      },
      // Polices : font-display (titres) et font-sans (texte, par défaut)
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
};
