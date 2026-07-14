// Unit tests for the ephemeral store, backed by an in-memory Redis mock.
// Uses Node's built-in test runner (`node --test`) so no test framework is
// installed just to run these.
const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const RedisMock = require('./fakeRedis');
const { savePing, getPing, listPings, keyFor, TTL_SECONDS } = require('./store');

let redis;
beforeEach(() => {
  redis = new RedisMock();
});

test('savePing then getPing returns the stored position', async () => {
  await savePing(redis, 'driver-1', 24.86, 67.0);
  const ping = await getPing(redis, 'driver-1');
  assert.equal(ping.driverId, 'driver-1');
  assert.equal(ping.lat, 24.86);
  assert.equal(ping.lng, 67.0);
  assert.equal(typeof ping.ts, 'number');
});

test('getPing returns null for an unknown driver', async () => {
  assert.equal(await getPing(redis, 'nobody'), null);
});

test('a saved ping carries a TTL so it expires on its own', async () => {
  await savePing(redis, 'driver-1', 1, 2);
  const ttl = await redis.ttl(keyFor('driver-1'));
  assert.ok(ttl > 0, 'ttl should be positive');
  assert.ok(ttl <= TTL_SECONDS, 'ttl should be within the window');
});

test('listPings returns every live ping', async () => {
  await savePing(redis, 'driver-1', 1, 2);
  await savePing(redis, 'driver-2', 3, 4);
  const ids = (await listPings(redis)).map((p) => p.driverId).sort();
  assert.deepEqual(ids, ['driver-1', 'driver-2']);
});

test('a new ping overwrites the previous position for the same driver', async () => {
  await savePing(redis, 'driver-1', 1, 1);
  await savePing(redis, 'driver-1', 9, 9);
  const ping = await getPing(redis, 'driver-1');
  assert.equal(ping.lat, 9);
  assert.equal((await listPings(redis)).length, 1);
});
