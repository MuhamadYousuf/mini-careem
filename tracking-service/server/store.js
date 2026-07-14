// Ephemeral GPS store.
//
// A GPS ping is worthless within seconds, so we never persist it to disk. Each
// ping is written to Redis under `ping:<driverId>` with a short TTL and simply
// vanishes when it goes stale. That is the whole architectural point of this
// service: we refuse to pay a database to store the past.

const KEY_PREFIX = 'ping:';
// A ping older than this many seconds is considered stale and expires itself.
const TTL_SECONDS = 30;

function keyFor(driverId) {
  return `${KEY_PREFIX}${driverId}`;
}

/** Write the latest position for a driver, with an automatic expiry. */
async function savePing(redis, driverId, lat, lng) {
  const value = JSON.stringify({ driverId, lat, lng, ts: Date.now() });
  await redis.set(keyFor(driverId), value, 'EX', TTL_SECONDS);
  return { driverId, lat, lng };
}

/** Read one driver's latest position, or null if it has expired / never existed. */
async function getPing(redis, driverId) {
  const raw = await redis.get(keyFor(driverId));
  return raw ? JSON.parse(raw) : null;
}

/** List every currently-live ping. Expired keys are already gone from Redis. */
async function listPings(redis) {
  const keys = await redis.keys(`${KEY_PREFIX}*`);
  if (keys.length === 0) return [];
  const values = await Promise.all(keys.map((k) => redis.get(k)));
  return values.filter(Boolean).map((v) => JSON.parse(v));
}

module.exports = { savePing, getPing, listPings, keyFor, TTL_SECONDS };
