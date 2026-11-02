// Données d'exemple du catalogue (marques fictives).
//
// Deux usages :
//  - "npm run seed" : VIDE la table puis réinsère les montres (remise à zéro).
//  - index.js appelle seedIfEmpty() au démarrage : insère les montres
//    uniquement si la table est vide (premier lancement).

const db = require('./db');

// Construit une URL Unsplash redimensionnée (800 px de large, qualité 80).
const unsplash = (photoId) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=800&q=80`;

const WATCHES = [
  {
    name: 'Méridien Automatique 40',
    brand: 'Maison Lefèvre',
    price: 2450,
    image: unsplash('1585123334904-845d60e97b29'),
    description:
      'Boîtier acier 40 mm, cadran blanc laqué et index appliqués. Mouvement automatique avec 42 heures de réserve de marche.',
    stock: 8,
  },
  {
    name: 'Héritage Petite Seconde',
    brand: 'Maison Lefèvre',
    price: 3890,
    image: unsplash('1524592094714-0f0654e20314'),
    description:
      'Hommage aux montres de poche des années 1930 : petite seconde à 6 h, aiguilles feuille bleuies, bracelet cuir d’alligator.',
    stock: 3,
  },
  {
    name: 'Nordhorn Expedition GMT',
    brand: 'Nordhorn',
    price: 1290,
    image: unsplash('1522312346375-d1a52e2b99b3'),
    description:
      'Montre de voyage à double fuseau horaire, lunette bidirectionnelle 24 h et étanchéité 200 m.',
    stock: 12,
  },
  {
    name: 'Nordhorn Fjord Diver',
    brand: 'Nordhorn',
    price: 990,
    image: unsplash('1547996160-81dfa63595aa'),
    description:
      'Plongeuse robuste en acier brossé, lunette unidirectionnelle céramique et index luminescents.',
    stock: 0, // volontairement épuisée pour tester l'affichage "stock épuisé"
  },
  {
    name: 'Aurelius Chronographe Céramique',
    brand: 'Aurelius',
    price: 7400,
    image: unsplash('1548171915-e79a380a2a4b'),
    description:
      'Chronographe à roue à colonnes, boîtier acier 44 mm, lunette céramique graduée et fond saphir.',
    stock: 2,
  },
  {
    name: 'Aurelius Classique Extra-Plate',
    brand: 'Aurelius',
    price: 5200,
    image: unsplash('1542496658-e33a6d0d50f6'),
    description:
      'Seulement 6,5 mm d’épaisseur. Cadran opalin, chiffres romains et remontage manuel.',
    stock: 5,
  },
  {
    name: 'Kairos Field 38',
    brand: 'Kairos',
    price: 420,
    image: unsplash('1612817159949-195b6eb9e31a'),
    description:
      'Montre de terrain lisible et légère, boîtier 38 mm, bracelet NATO et verre minéral traité anti-reflets.',
    stock: 20,
  },
  {
    name: 'Kairos Monochrome',
    brand: 'Kairos',
    price: 360,
    image: unsplash('1587836374828-4dbafa94cf0e'),
    description:
      'Design minimaliste tout noir, boîtier PVD, mouvement quartz suisse et bracelet maille milanaise.',
    stock: 15,
  },
  {
    name: 'Méridien Lune',
    brand: 'Maison Lefèvre',
    price: 4650,
    image: unsplash('1533139502658-0198f920d8e8'),
    description:
      'Complication phase de lune peinte à la main, date à aiguille et boîtier acier poli 39 mm.',
    stock: 1,
  },
  {
    name: 'Nordhorn Pilot Chrono',
    brand: 'Nordhorn',
    price: 1650,
    image: unsplash('1614164185128-e4ec99c436d7'),
    description:
      'Chronographe d’aviateur, grande couronne pour gants, lunette tachymètre et cadran noir mat.',
    stock: 7,
  },
];

// Insère les montres seulement si la table est vide. Renvoie le nombre inséré.
async function seedIfEmpty() {
  if ((await db.count()) > 0) return 0;
  await db.createMany(WATCHES);
  return WATCHES.length;
}

// Exécuté directement ("node src/seed.js") : remise à zéro complète.
// require.main === module est vrai seulement si ce fichier est le point d'entrée.
if (require.main === module) {
  (async () => {
    await db.init();
    await db.deleteAll();
    await db.createMany(WATCHES);
    console.log(`[seed] ${WATCHES.length} montres insérées.`);
    await db.close();
  })().catch((err) => {
    console.error('[seed] Échec :', err);
    process.exit(1);
  });
}

module.exports = { seedIfEmpty, WATCHES };
