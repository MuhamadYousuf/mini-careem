# Drivers Service — Python · Django · MongoDB

> Part of **mini-Careem**. This service owns **driver profiles**.

## Why this stack

Driver profiles are **documents**, not rows. A bike rider, a car captain and a
rickshaw driver share only a few fields (name, phone, licence) and differ in
everything else: engine size, seat count, permit zones, which identity papers
were scanned. Forcing them into one relational table means a wall of nullable
columns and a migration every time a new vehicle type appears.

MongoDB stores each profile with its own shape. Django gives us a clean REST
layer, and **mongoengine** maps documents to Python objects. There is no
relational database in this service at all.

## The document model

Every driver shares a small typed core:

`name`, `phone`, `email`, `license_number`, `vehicle_type` (`BIKE`/`CAR`/`RICKSHAW`), `status`.

Everything vehicle-specific rides along in two flexible fields:

- **`vehicle`** — a free-form object, e.g.
  `{"engine_cc": 70}` for a bike, `{"make":"Toyota","seats":4,"ac":true}` for a car.
- **`documents`** — a list of uploaded references, e.g.
  `[{"kind":"license","url":"s3://..."}]`.

No schema migration is needed to add a new vehicle type — that flexibility is
the whole reason for choosing MongoDB here.

## API

Base path (behind the gateway): `/api/drivers`

| Method | Path              | Purpose                                   |
|--------|-------------------|-------------------------------------------|
| GET    | `/health`         | Liveness probe                            |
| POST   | `/`               | Create a driver                           |
| GET    | `/`               | List drivers (optional `?vehicle_type=CAR`) |
| GET    | `/{id}`           | Retrieve one driver                       |
| PATCH  | `/{id}`           | Update status / vehicle / documents       |
| DELETE | `/{id}`           | Remove a driver                           |

Create example:

```json
{
  "name": "Sana",
  "phone": "+923009999999",
  "license_number": "LIC-CAR-1",
  "vehicle_type": "CAR",
  "vehicle": {"make": "Toyota", "seats": 4, "ac": true}
}
```

## Run it

### With Docker (service + its private MongoDB)

```bash
docker compose up --build
# service on http://localhost:8082
```

### Locally (needs a MongoDB on :27017)

```bash
pip install -r requirements.txt
MONGODB_URI=mongodb://localhost:27017/drivers python manage.py runserver 0.0.0.0:8082
```

Connection is env-driven (`MONGODB_URI`) so the same image runs locally and on
AWS Lightsail.

## Tests

```bash
python manage.py test
```

The suite uses **mongomock**, an in-memory MongoDB, so **no database server is
required**. Nine tests cover: the health probe, creating drivers with flexible
per-vehicle fields, that different vehicle types store different shapes,
validation of required/enum fields, retrieve + status update, 404 handling,
deletion, and that the documents list is persisted.

Expected output:

```
Ran 9 tests in 0.0..s
OK
```

## Layout

```
config/            # Django project (settings, urls, wsgi)
drivers/
  documents.py     # mongoengine Driver document (the flexible schema)
  serializers.py   # DRF request validation
  views.py         # REST endpoints (APIView)
  urls.py
  tests.py         # 9 tests, backed by mongomock
manage.py
```
