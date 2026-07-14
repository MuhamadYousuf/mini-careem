# Wallet Service — Java · Spring Boot · MySQL

> Part of **mini-Careem**. This service owns **money**.

## Why this stack

Fares are money, and money is the one thing in the system that must never be
approximate, lost, or double-counted. That demands **ACID transactions**, a
**double-entry ledger**, and mature, boring, battle-tested tooling. Java +
Spring Boot + MySQL is exactly that. This is the only service in mini-Careem
backed by a relational database, and that is a deliberate choice forced by the
data.

## The double-entry model

There is no `balance` column anywhere. Instead, every movement of money writes
**two ledger entries** inside a single database transaction:

- a **DEBIT** on the source wallet (stored as a negative amount), and
- a **CREDIT** on the destination wallet (stored as a positive amount).

A wallet's balance is *derived* by summing its entries. The whole ledger always
sums to **zero**, so the books can never silently drift. If either write fails,
the transaction rolls back and neither is applied — that is the ACID guarantee.

Deposits are modelled as a transfer from an internal **SYSTEM** (house) wallet,
so even "adding money" has a matching debit somewhere. USER wallets may never go
negative; the SYSTEM wallet may.

## API

Base path (behind the gateway): `/api/wallet`

| Method | Path                          | Purpose                              |
|--------|-------------------------------|--------------------------------------|
| GET    | `/health`                     | Liveness probe                       |
| POST   | `/wallets`                    | Create a wallet (`{ "ownerRef": "rider-1" }`) |
| GET    | `/wallets/{id}`               | Fetch wallet + derived balance       |
| POST   | `/wallets/{id}/deposit`       | Fund from house account (`{ "amount": 500 }`) |
| POST   | `/transfers`                  | Move money (`{ "fromWalletId":1, "toWalletId":2, "amount":180 }`) |
| GET    | `/wallets/{id}/entries`       | List ledger entries (newest first)   |

Error mapping: unknown wallet → `404`, overdraw → `422`, bad input → `400`.

## Run it

### With Docker (service + its private MySQL)

```bash
docker compose up --build
# service on http://localhost:8081
```

### Locally (needs a MySQL on :3306 and Maven)

```bash
mvn spring-boot:run
```

Configuration is environment-driven (`DB_URL`, `DB_USER`, `DB_PASSWORD`) so the
same image runs on your laptop and on AWS Lightsail unchanged.

## Quick smoke test

```bash
# create two wallets
R=$(curl -s -XPOST localhost:8081/api/wallet/wallets -H 'Content-Type: application/json' -d '{"ownerRef":"rider-1"}')
D=$(curl -s -XPOST localhost:8081/api/wallet/wallets -H 'Content-Type: application/json' -d '{"ownerRef":"driver-1"}')
# fund the rider, then pay the driver a fare
curl -s -XPOST localhost:8081/api/wallet/wallets/1/deposit -H 'Content-Type: application/json' -d '{"amount":500}'
curl -s -XPOST localhost:8081/api/wallet/transfers -H 'Content-Type: application/json' -d '{"fromWalletId":1,"toWalletId":2,"amount":180}'
curl -s localhost:8081/api/wallet/wallets/1   # balance 320
curl -s localhost:8081/api/wallet/wallets/2   # balance 180
```

## Tests

```bash
mvn test
```

Three layers of tests:

- **`WalletServiceTest`** — pure unit tests (Mockito, no DB). Proves the
  debit/credit pair balances to zero, rejects overdrafts and non-positive
  amounts, and that deposits draw from the SYSTEM wallet.
- **`WalletServiceIntegrationTest`** — full service + JPA against in-memory H2.
  Proves deposit→transfer balances are correct and the whole ledger nets to zero.
- **`WalletControllerTest`** — `@WebMvcTest` (MockMvc). Proves routing,
  validation, and HTTP status-code mapping.

The test suite uses H2, so **no MySQL is required to run the tests**.

## Layout

```
src/main/java/com/minicareem/wallet/
  WalletApplication.java        # Spring Boot entry point
  model/                        # Wallet, LedgerEntry, EntryType, WalletType
  repository/                   # Spring Data JPA repositories
  service/WalletService.java    # the double-entry logic (transactional)
  web/                          # REST controller + exception handling
  dto/                          # request/response bodies
```
