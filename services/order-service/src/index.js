// Point d'entrée de l'order-service : configure Express et démarre le serveur.

const express = require('express');
const cors = require('cors');
const config = require('./config'); // en premier : charge le .env
const db = require('./db');
const ordersRouter = require('./routes/orders');
const { HttpError } = require('./errors');

const app = express();

// ---------- Middlewares globaux ----------

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

// Petit logger : méthode, URL, code de réponse et durée.
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - start} ms)`);
  });
  next();
});

// ---------- Routes ----------

// Sonde de santé : ne vérifie que la base de CE service. On n'interroge pas
// product-service ici pour qu'une panne ne se propage pas en cascade.
app.get('/health', async (req, res) => {
  try {
    await db.ping();
    res.json({ status: 'ok', service: config.serviceName, uptime: Math.round(process.uptime()) });
  } catch {
    res.status(503).json({ status: 'error', service: config.serviceName });
  }
});

app.use('/api/orders', ordersRouter);

// Toute route non trouvée -> 404 JSON.
app.use((req, res, next) => {
  next(new HttpError(404, `Route introuvable : ${req.method} ${req.originalUrl}`));
});

// ---------- Gestion centralisée des erreurs ----------
// Format de réponse unique : { error: { message, details? } }
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Corps JSON invalide' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Corps de requête trop volumineux' } });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: { message: err.message, ...(err.details && { details: err.details }) },
    });
  }
  console.error(err);
  res.status(500).json({ error: { message: 'Erreur interne du serveur' } });
});

// ---------- Démarrage ----------

async function start() {
  await db.init();

  const server = app.listen(config.port, () => {
    console.log(`${config.serviceName} à l'écoute sur le port ${config.port}`);
    console.log(`product-service attendu sur ${config.productServiceUrl}`);
  });

  // Arrêt propre (Ctrl+C, ou SIGTERM envoyé par Docker plus tard).
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
