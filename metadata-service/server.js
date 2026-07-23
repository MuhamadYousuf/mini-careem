const express = require('express');
const Redis = require('ioredis');
const sqlite3 = require('sqlite3').verbose();

const app = express();
app.use(express.json());

// 1. Setup Local SQLite Database (Owns its own data!)
const db = new sqlite3.Database(':memory:'); 
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT)");
  const initialData = JSON.stringify({
    baseFare: 5.00,
    perKmRate: 1.50,
    perMinuteRate: 0.50,
    peakFactor: 1.0 // Normal traffic multiplier
  });
  db.run("INSERT OR REPLACE INTO metadata (key, value) VALUES ('pricing', ?)", [initialData]);
});

// 2. Connect to Redis Cache with Auto-Recovery
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(redisUrl, {
  retryStrategy: (times) => Math.min(times * 50, 2000),
  maxRetriesPerRequest: 1
});

let isRedisUp = true;
redis.on('connect', () => { isRedisUp = true; });
redis.on('error', () => { isRedisUp = false; }); // Catch errors so the app doesn't crash!

const getFromDatabase = () => {
  return new Promise((resolve, reject) => {
    db.get("SELECT value FROM metadata WHERE key = 'pricing'", (err, row) => {
      if (err) reject(err);
      else resolve(row ? JSON.parse(row.value) : null);
    });
  });
};

const saveToDatabase = (data) => {
  return new Promise((resolve, reject) => {
    db.run("INSERT OR REPLACE INTO metadata (key, value) VALUES ('pricing', ?)", [JSON.stringify(data)], (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

// 3. GET Endpoint: Read from Redis first, fallback to SQLite if Redis is down
app.get('/api/metadata', async (req, res) => {
  try {
    if (isRedisUp) {
      try {
        const cachedData = await redis.get('metadata:pricing');
        if (cachedData) {
          return res.status(200).json({ source: 'cache', data: JSON.parse(cachedData) });
        }
      } catch (e) { /* Ignore cache read errors and fallback */ }
    }

    const dbData = await getFromDatabase();
    if (isRedisUp && dbData) {
      redis.set('metadata:pricing', JSON.stringify(dbData), 'EX', 60).catch(() => {});
    }

    return res.status(200).json({ source: 'database', data: dbData });
  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 4. POST Endpoint: Update rush-hour surge without serving stale data
app.post('/api/metadata/surge', async (req, res) => {
  const { peakFactor } = req.body;
  if (typeof peakFactor !== 'number' || peakFactor < 1.0) {
    return res.status(400).json({ error: 'Invalid peakFactor value' });
  }

  try {
    const currentData = await getFromDatabase();
    currentData.peakFactor = peakFactor;
    await saveToDatabase(currentData);

    if (isRedisUp) {
      await redis.set('metadata:pricing', JSON.stringify(currentData), 'EX', 60).catch(() => {});
    }

    return res.status(200).json({ status: 'success', data: currentData });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update surge factor' });
  }
});

const PORT = process.env.PORT || 3004;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Metadata service running on port ${PORT}`));
}

module.exports = app;