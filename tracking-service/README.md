# Tracking Service — JavaScript · React · Redis (in-memory)

> Part of **mini-Careem**. This service owns **live driver locations**.

## Why this stack

A GPS ping is stale within seconds. Persisting every ping to disk means paying a
database to store a past nobody will ever read. So the right store is **RAM**:
Redis holds only each driver's *latest* position, each key carrying a short TTL
so stale pings expire and vanish on their own. The UI is **React + Bootstrap**,
because a live map is a front-end problem.

This service deliberately has **no durable database**. Losing the data on
restart is fine — every driver just sends a fresh ping a second later.

## How it works

```
React map (browser)  ──poll every 3s──▶  Node/Express (thin)  ──▶  Redis
        ▲                                                            │
        └──────────────── drivers whose TTL expired disappear ◀──────┘
```

- **`POST /pings`** writes `ping:<driverId>` → `{lat,lng,ts}` with a 30-second TTL.
- **`GET /pings`** returns every key still alive; expired ones are already gone.
- The React client polls `GET /pings` and redraws markers on a plain SVG map
  (no map library or tiles — kept basic on purpose).

## Two pages

The React app has two tabs (top nav):

- **Ride Demo** (`RideDemo.jsx`) — the headline. It runs the whole **ride
  lifecycle** in the browser and composes all three services through the
  gateway: the customer requests a ride (Wallet creates + funds a wallet), a
  driver is assigned (Drivers picks/creates an ACTIVE captain), the driver
  animates toward the pickup while streaming GPS pings (Tracking), the ride goes
  **Started → Stopped**, then the customer pays and the driver's standing
  balance updates (Wallet transfer) → **Complete**. Any step that fails flips the
  ride to **Failed** with the reason. A "Demo a failure" dropdown forces the
  no-driver, tracking-drop, or insufficient-funds paths on demand (the last one
  is a *real* 422 from the Wallet service).
- **Live Map** (`LiveMap.jsx`) — the raw tracking feed: every driver's latest
  ping, polled every few seconds.

The ride state machine lives entirely on the client — a faithful, runnable
version of the deck's "one ride, three services" slide. It changes no backend.

## API

Base path (behind the gateway): `/api/tracking`

| Method | Path             | Purpose                          |
|--------|------------------|----------------------------------|
| GET    | `/health`        | Liveness probe                   |
| POST   | `/pings`         | Record `{driverId, lat, lng}`    |
| GET    | `/pings`         | List all live pings              |
| GET    | `/pings/{id}`    | One driver's ping (404 if stale) |

## Run it

### With Docker (Redis + API + built UI)

```bash
docker compose up --build
# UI on http://localhost:5173 , API on http://localhost:8083
```

### Locally

```bash
# 1. a Redis on :6379 (e.g. docker run -p 6379:6379 redis:7-alpine)
# 2. API
cd server && npm install && REDIS_URL=redis://localhost:6379 npm start
# 3. UI (proxies /api to the gateway on :8080 during dev)
cd client && npm install && npm run dev
```

## Tests

Backend (Node) — uses **ioredis-mock**, so no Redis is needed:

```bash
cd server && npm install && npm test
```

Covers the store (save/get/list, TTL is set, overwrite) and the HTTP layer
(health, create, validation, list, 404).

Frontend (React) — uses **Vitest + Testing Library**:

```bash
cd client && npm install && npm test
```

29 tests: the fare model, the ride status machine, geo helpers
(project/lerp/haversine), the orchestrator's service composition and every
failure reason (with an injected fake API), the full `RideDemo` happy path
(asserting the driver balance actually changes) plus its no-driver and
insufficient-funds failure paths, and the original `LiveMap` feed.

## Layout

```
server/
  store.js      # Redis read/write with TTL (the ephemeral logic)
  app.js        # Express factory (redis injected for testability)
  index.js      # production entry point
  *.test.js     # jest + ioredis-mock
client/
  src/geo.js         # pure geometry: project + lerp + haversineKm (unit-tested)
  src/api.js         # fetch wrappers for wallet + drivers + tracking
  src/ride/fare.js       # fare model (unit-tested)
  src/ride/rideStatus.js # the ride state machine (unit-tested)
  src/ride/orchestrator.js # composes the 3 services, injectable (unit-tested)
  src/RideDemo.jsx   # animated ride lifecycle page (headline)
  src/LiveMap.jsx    # raw tracking feed page
  src/App.jsx        # tab nav between the two pages
  src/*.test.*       # vitest + testing-library
```
