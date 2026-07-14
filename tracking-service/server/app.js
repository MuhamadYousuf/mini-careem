// Thin Express layer over the Redis-backed ping store.
//
// The app is created via a factory that takes a Redis client, so tests can pass
// an in-memory mock while production passes a real ioredis connection.

const express = require('express');
const { savePing, getPing, listPings } = require('./store');

function createApp(redis) {
  const app = express();
  app.use(express.json());

  const router = express.Router();

  router.get('/health', (req, res) => res.json({ status: 'tracking ok' }));

  // Record a driver's latest GPS position.
  router.post('/pings', async (req, res) => {
    const { driverId, lat, lng } = req.body || {};
    if (!driverId || typeof lat !== 'number' || typeof lng !== 'number') {
      return res
        .status(400)
        .json({ error: 'driverId (string), lat (number) and lng (number) are required' });
    }
    const saved = await savePing(redis, driverId, lat, lng);
    return res.status(201).json(saved);
  });

  // All live pings (used by the map to draw every moving driver).
  router.get('/pings', async (req, res) => {
    res.json(await listPings(redis));
  });

  // One driver's latest position, 404 once it has expired.
  router.get('/pings/:driverId', async (req, res) => {
    const ping = await getPing(redis, req.params.driverId);
    if (!ping) return res.status(404).json({ error: 'no live ping for driver' });
    return res.json(ping);
  });

  app.use('/api/tracking', router);
  return app;
}

module.exports = { createApp };
