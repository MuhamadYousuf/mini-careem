// HTTP-level tests for the Express layer. We start the app on an ephemeral port
// and drive it with the built-in fetch, so no supertest dependency is needed.
const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const RedisMock = require('./fakeRedis');
const { createApp } = require('./app');

const redis = new RedisMock();
let server;
let base;

before(async () => {
  await new Promise((resolve) => {
    server = createApp(redis).listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(() => server && server.close());

beforeEach(async () => {
  await redis.flushall();
});

function post(body) {
  return fetch(`${base}/api/tracking/pings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

test('GET /health is up', async () => {
  const res = await fetch(`${base}/api/tracking/health`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).status, 'tracking ok');
});

test('POST /pings stores and returns the position', async () => {
  const res = await post({ driverId: 'driver-1', lat: 24.86, lng: 67.0 });
  assert.equal(res.status, 201);
  assert.equal((await res.json()).driverId, 'driver-1');
});

test('POST /pings rejects a missing coordinate', async () => {
  const res = await post({ driverId: 'driver-1', lat: 24.86 });
  assert.equal(res.status, 400);
});

test('GET /pings lists live drivers', async () => {
  await post({ driverId: 'a', lat: 1, lng: 2 });
  await post({ driverId: 'b', lat: 3, lng: 4 });
  const res = await fetch(`${base}/api/tracking/pings`);
  assert.equal(res.status, 200);
  assert.equal((await res.json()).length, 2);
});

test('GET /pings/:id returns 404 when no live ping exists', async () => {
  const res = await fetch(`${base}/api/tracking/pings/ghost`);
  assert.equal(res.status, 404);
});
