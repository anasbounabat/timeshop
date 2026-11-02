# TimeShop

Site vitrine d'une boutique de montres. Le front est un site statique (HTML, CSS, JavaScript, sans étape de build) qui affiche le catalogue en interrogeant une API produits.

Le projet est découpé en microservices pour pouvoir être conteneurisé plus tard : un dossier par service, toute la configuration passe par des variables d'environnement, chaque service a sa propre base de données.

## Fonctionnalités

Page d'accueil (`index.html`) :

- une vidéo plein écran pilotée par le scroll : elle avance quand on descend et recule quand on remonte, avec trois textes qui apparaissent au fil de la vidéo ;
- une section « Savoir-faire » : quatre photos qui s'enchaînent au scroll (fondu, zoom lent, barre de progression) ;
- le catalogue des montres, chargé depuis l'API, avec recherche, tri (prix, nom) et filtre par marque.

Page détail (`product.html?id=3`) :

- photo avec zoom au survol, prix, description, état du stock ;
- informations de livraison, retour et garantie ;
- trois suggestions de montres.

Les états de chargement, d'erreur (API injoignable, montre introuvable) et de stock épuisé sont gérés. Si l'utilisateur a activé « réduire les animations » dans son système, les animations au scroll sont désactivées et le contenu s'affiche de façon statique.

## Technologies

- Front : HTML, CSS, JavaScript, avec Tailwind CSS, Alpine.js et GSAP (ScrollTrigger) chargés par CDN. Polices Google Fonts : Playfair Display et Inter.
- API produits : Node.js, Express, SQLite (better-sqlite3), dotenv, cors.

## Architecture

```
  Navigateur (front statique, http://localhost:3000)
  index.html, product.html
        |
        |  GET /api/products
        |  GET /api/products/:id
        v
  product-service (http://localhost:3001)
        |
        v
  products.db (SQLite)
```

Tout l'accès à la base est regroupé dans `services/product-service/src/db.js`, derrière des fonctions asynchrones. Pour passer de SQLite à PostgreSQL, il suffit de réécrire ce fichier.

Le dossier `services/order-service` contient une API de commandes réalisée dans une première version du projet. Le front ne l'utilise plus depuis le retrait du panier, et il n'est pas nécessaire de la lancer.

## Arborescence

```
timeshop/
  frontend/
    index.html            page d'accueil (hero vidéo, savoir-faire, catalogue)
    product.html          page détail d'une montre
    serve.json            configuration de "npx serve" (garde les ?id= dans l'URL)
    css/style.css         styles complémentaires à Tailwind
    js/
      config.js           URL de l'API produits
      api.js              toutes les requêtes vers l'API
      theme.js            thème Tailwind (couleurs, polices)
      format.js           formatage des prix en euros
      catalog.js          catalogue : chargement, recherche, tri, filtre
      product.js          page détail et suggestions
      hero-scroll.js      vidéo du hero pilotée par le scroll
      craft-section.js    section savoir-faire animée au scroll
    assets/
      videos/hero.mp4     vidéo du hero
      images/             poster de la vidéo et photos du savoir-faire
  services/
    product-service/      API produits (port 3001)
      src/
        index.js          serveur Express, middlewares, gestion des erreurs
        config.js         lecture et vérification des variables d'environnement
        errors.js         classe HttpError
        db.js             accès à la base SQLite
        seed.js           montres d'exemple
        routes/products.js
      package.json
      .env.example
    order-service/        API commandes (non utilisée par le front)
  .gitignore
  README.md
```

## Lancer le projet en local

Prérequis : Node.js 20 ou plus récent.

1. Démarrer l'API produits :

```bash
cd services/product-service
cp .env.example .env
npm install
npm run dev
```

Au premier démarrage, la base est vide : dix montres d'exemple sont insérées automatiquement. Pour remettre le catalogue à zéro : `npm run seed`.

2. Dans un autre terminal, depuis le dossier `timeshop/`, servir le front :

```bash
npx serve frontend -l 3000
```

3. Ouvrir http://localhost:3000

Le front doit être servi par un serveur HTTP comme ci-dessus, et non ouvert en double-cliquant sur le fichier. L'adresse de l'API se règle dans `frontend/js/config.js`.

### Scripts npm (product-service)

| Script         | Rôle                                                    |
|----------------|---------------------------------------------------------|
| `npm start`    | démarre le service                                      |
| `npm run dev`  | démarre avec redémarrage automatique (`node --watch`)   |
| `npm run seed` | vide le catalogue et réinsère les montres d'exemple     |

### Variables d'environnement (product-service)

| Variable      | Exemple              | Rôle                                                   |
|---------------|----------------------|--------------------------------------------------------|
| `PORT`        | `3001`               | port d'écoute (obligatoire)                            |
| `DB_PATH`     | `./data/products.db` | fichier SQLite (obligatoire, dossier créé s'il manque) |
| `CORS_ORIGIN` | `*`                  | origines autorisées à appeler l'API                    |

Le fichier `.env` n'est jamais commité : seul `.env.example` est versionné.

## API produits

Réponses en JSON : `{ "data": ... }` en cas de succès, `{ "error": { "message": "...", "details": ... } }` en cas d'erreur.

| Méthode | Route                     | Description                                               | Codes              |
|---------|---------------------------|-----------------------------------------------------------|--------------------|
| GET     | `/health`                 | état du service et de sa base                             | 200, 503           |
| GET     | `/api/products`           | liste des montres, filtre optionnel `?brand=Kairos`       | 200, 400           |
| GET     | `/api/products/:id`       | détail d'une montre                                       | 200, 400, 404      |
| POST    | `/api/products`           | ajoute une montre                                         | 201, 400           |
| PATCH   | `/api/products/:id/stock` | modifie le stock : `{ "delta": -2 }` ou `{ "stock": 15 }` | 200, 400, 404, 409 |

## Crédits et utilisation de l'IA

- La vidéo du hero et les photos de la section « Savoir-faire » ont été générées par IA avec Gemini (Google), à partir de prompts que j'ai rédigés.
- Le front a été développé avec Claude Code, et en partie par moi.
- Les photos des montres du catalogue proviennent d'Unsplash. Les marques et les modèles sont fictifs.
