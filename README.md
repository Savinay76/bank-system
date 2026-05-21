# Bank Account Management System
### Event Sourcing + CQRS — Node.js · TypeScript · PostgreSQL · Docker

---

## Overview

A fully functional bank account management API built on **Event Sourcing** and
**Command Query Responsibility Segregation (CQRS)** principles.

| Concern | Approach |
|---|---|
| Write model | Append-only event store (`events` table) |
| Read models | Denormalised projection tables (`account_summaries`, `transaction_history`) |
| Aggregate loading | Latest snapshot + subsequent event replay |
| Concurrency | Optimistic concurrency via `SELECT … FOR UPDATE` |
| Idempotency | `transactionId` tracking inside aggregate state; `ON CONFLICT DO NOTHING` in projectors |
| Snapshotting | Every 50th event per aggregate (configurable via `SNAPSHOT_THRESHOLD`) |
| Projections | Updated synchronously after each command |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (HTTP)                        │
└────────────────┬────────────────────────────┬───────────────┘
                 │  Commands (POST)           │  Queries (GET)
                 ▼                            ▼
        ┌────────────────┐          ┌──────────────────┐
        │ Command Handler│          │  Query Handler   │
        │ (write side)   │          │  (read side)     │
        └───────┬────────┘          └────────┬─────────┘
                │ load / save                │ reads from
                ▼                            ▼
        ┌──────────────┐          ┌─────────────────────────┐
        │  BankAccount │          │ account_summaries        │
        │  Aggregate   │          │ transaction_history      │
        └──────┬───────┘          └─────────────────────────┘
               │ append events             ▲
               ▼                           │ project
        ┌──────────────┐          ┌────────┴────────┐
        │  Event Store │─────────▶│ ProjectionMgr   │
        │  (events)    │          │                 │
        └──────────────┘          └─────────────────┘
               │
               ▼
        ┌──────────────┐
        │  Snapshots   │
        └──────────────┘
```

---

## Quick Start

### Prerequisites
- Docker ≥ 20.10 & Docker Compose ≥ 2.x

### 1. Clone & configure

```bash
git clone <repo-url>
cd bank-account-management-system
cp .env.example .env   # edit values if needed
```

### 2. Start all services

```bash
docker-compose up --build
```

> Both services expose health checks. Docker Compose waits for the database to
> be ready before starting the app.

### 3. Verify

```bash
curl http://localhost:8080/health
```

Expected:
```json
{ "status": "healthy", "timestamp": "...", "services": { "database": "up" } }
```

---

## API Reference

### Command Endpoints (write side)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/accounts` | Create a new bank account |
| `POST` | `/api/accounts/:id/deposit` | Deposit money |
| `POST` | `/api/accounts/:id/withdraw` | Withdraw money |
| `POST` | `/api/accounts/:id/close` | Close account (balance must be 0) |

#### Create Account — `POST /api/accounts`
```json
{
  "accountId": "acc-001",
  "ownerName": "Alice Smith",
  "initialBalance": 0,
  "currency": "USD"
}
```
Returns `202 Accepted` · `409 Conflict` if account already exists.

#### Deposit — `POST /api/accounts/:accountId/deposit`
```json
{ "amount": 250.00, "description": "Paycheck", "transactionId": "txn-abc-001" }
```

#### Withdraw — `POST /api/accounts/:accountId/withdraw`
```json
{ "amount": 50.00, "description": "ATM", "transactionId": "txn-abc-002" }
```
Returns `409 Conflict` for insufficient funds or closed account.

#### Close Account — `POST /api/accounts/:accountId/close`
```json
{ "reason": "Customer request" }
```
Returns `409 Conflict` if balance ≠ 0.

---

### Query Endpoints (read side)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/accounts/:id` | Current account state (from projection) |
| `GET` | `/api/accounts/:id/events` | Full audit event stream |
| `GET` | `/api/accounts/:id/balance-at/:timestamp` | Time-travel balance query |
| `GET` | `/api/accounts/:id/transactions?page=1&pageSize=10` | Paginated transactions |

#### Get Account — `GET /api/accounts/:accountId`
```json
{
  "accountId": "acc-001",
  "ownerName": "Alice Smith",
  "balance": 200.00,
  "currency": "USD",
  "status": "OPEN"
}
```

#### Time Travel — `GET /api/accounts/:accountId/balance-at/2024-01-15T12:00:00Z`
```json
{ "accountId": "acc-001", "balanceAt": 100.00, "timestamp": "2024-01-15T12:00:00.000Z" }
```

#### Transactions (paginated) — `GET /api/accounts/:accountId/transactions?page=2&pageSize=10`
```json
{
  "currentPage": 2,
  "pageSize": 10,
  "totalPages": 3,
  "totalCount": 25,
  "items": [ { "transactionId": "...", "type": "DEPOSIT", "amount": 100, "description": "...", "timestamp": "..." } ]
}
```

---

### Admin / Projection Endpoints

| Method | Path | Description |
|---|---|---|
| `GET`  | `/api/projections/status` | Projection lag and event counts |
| `POST` | `/api/projections/rebuild` | Wipe and rebuild all read models |

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `API_PORT` | HTTP port the app listens on | `8080` |
| `DATABASE_URL` | PostgreSQL connection string | — |
| `DB_USER` | PostgreSQL username | — |
| `DB_PASSWORD` | PostgreSQL password | — |
| `DB_NAME` | PostgreSQL database name | — |
| `SNAPSHOT_THRESHOLD` | Events per aggregate before snapshotting | `50` |

---

## Database Schema

| Table | Purpose |
|---|---|
| `events` | Immutable event store — source of truth |
| `snapshots` | Periodic aggregate state snapshots |
| `account_summaries` | Read-model projection: current account state |
| `transaction_history` | Read-model projection: all deposits & withdrawals |
| `projection_tracking` | Tracks how far each projector has processed |

---

## Key Design Decisions

### Event Sourcing
All state changes are captured as immutable domain events
(`AccountCreated`, `MoneyDeposited`, `MoneyWithdrawn`, `AccountClosed`). The
event store is the single source of truth.

### CQRS
- **Commands** write to the event store via aggregate command handlers.
- **Queries** read exclusively from projection tables for optimal performance.
- Time-travel and audit queries are the only exceptions and read from the event
  store directly.

### Snapshotting
After every `SNAPSHOT_THRESHOLD` (default 50) events per aggregate, the
repository saves a JSON snapshot of the aggregate's current state. Future
loads only replay events *after* the snapshot, keeping hydration O(recent
events) instead of O(total events).

### Idempotency
- **Commands**: each deposit/withdrawal carries a `transactionId` that the
  aggregate tracks in its state. Duplicate IDs are silently ignored.
- **Projections**: `ON CONFLICT DO NOTHING` and version-guarded `UPDATE`
  statements make re-processing the same event safe.

### Optimistic Concurrency
`EventStore.appendEvents` takes an `expectedVersion` parameter and uses
`SELECT … FOR UPDATE` to lock the aggregate's event row before inserting,
preventing concurrent writes from creating gaps or duplicates.

---

## Project Structure

```
├── src/
│   ├── domain/
│   │   ├── errors.ts                    # Custom error hierarchy
│   │   ├── events/types.ts             # Event type definitions
│   │   └── aggregates/BankAccount.ts  # Aggregate root
│   ├── infrastructure/
│   │   ├── database.ts                 # pg Pool factory
│   │   ├── EventStore.ts              # Append + query events
│   │   └── SnapshotStore.ts           # Snapshot persistence
│   ├── projections/
│   │   ├── AccountSummaryProjector.ts
│   │   ├── TransactionHistoryProjector.ts
│   │   └── ProjectionManager.ts       # Orchestrates all projectors
│   ├── application/
│   │   ├── BankAccountRepository.ts   # Load / save aggregate
│   │   ├── commands/                  # Command handlers
│   │   └── queries/                   # Query handlers
│   └── api/
│       ├── app.ts                     # Express app factory (DI root)
│       ├── routes/                    # Command & query routers
│       ├── middleware/errorHandler.ts
│       └── index.ts                   # Server startup
├── seeds/001_schema.sql               # DB schema (auto-loaded by Postgres)
├── docker-compose.yml
├── Dockerfile
├── .env.example
├── submission.json
└── README.md
```
