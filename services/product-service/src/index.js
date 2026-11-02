// Point d'entrée du product-service : configure Express et démarre le serveur.

const express = require('express');
const cors = require('cors');
const config = require('./config'); // en premier : charge le .env
const db = require('./db');
const { seedIfEmpty } = require('./seed');
const productsRouter = require('./routes/products');
const { HttpError } = require('./errors');

const app = express();

// ---------- Middlewares globaux ----------

// Autorise le front (servi sur un autre port/domaine) à appeler l'API.
app.use(cors({ origin: config.corsOrigin }));

// Petit logger : méthode, URL, code de réponse et durée.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start} ms)`);
  });
  next();
});

// ---------- Routes ----------

// Sonde de santé (utile plus tard pour Docker/Kubernetes).
app.get('/health', async (req, res) => {
  try {
    await db.ping();
    res.json({ status: 'ok', service: config.serviceName, uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ status: 'error', service: config.serviceName });
  }
});

app.use('/api/products', productsRouter);

// Toute route non trouvée -> 404 JSON (au lieu de la page HTML d'Express).
app.use((req, res, next) => {
  next(new HttpError(404, `Route introuvable : ${req.method} ${req.originalUrl}`));
});

// ---------- Gestion centralisée des erreurs ----------
// Express reconnaît un middleware d'erreur à ses 4 paramètres.
// Format de réponse unique : { error: { message, details? } }
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { message: err.message, ...(err.details && { details: err.details }) },
    });
  }
  // Erreur inattendue : on la journalise, mais on ne divulgue pas les détails au client.
  console.error(err);
  res.status(500).json({ error: { message: 'Erreur interne du serveur' } });
});

// ---------- Démarrage ----------

async function start() {
  await db.init();
  const inserted = await seedIfEmpty();
  if (inserted > 0) console.log(`[seed] Base vide : ${inserted} montres d'exemple insérées.`);

  const server = app.listen(config.port, () => {
    console.log(`${config.serviceName} à l'écoute sur le port ${config.port}`);
  });

  // Arrêt propre (Ctrl+C en local, SIGTERM envoyé par Docker plus tard) :
  // on termine les requêtes en cours puis on ferme la base.
  const shutdown = (signal) => {
    console.log(`${signal} reçu, arrêt en cours...`);
    server.close(async () => {
      await db.close();
      process.exit(0);
    });
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Impossible de démarrer le service :', err);
  process.exit(1);
});
