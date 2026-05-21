-- =============================================================================
-- Bank Account Management System - Database Schema
-- Event Sourcing + CQRS
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Global sequence for cross-aggregate ordering (used by projections tracking)
-- ---------------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS global_event_sequence START 1 INCREMENT 1;

-- ---------------------------------------------------------------------------
-- EVENT STORE - The source of truth (immutable append-only log)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    event_id        UUID                     PRIMARY KEY NOT NULL,
    aggregate_id    VARCHAR(255)             NOT NULL,
    aggregate_type  VARCHAR(255)             NOT NULL DEFAULT 'BankAccount',
    event_type      VARCHAR(255)             NOT NULL,
    event_data      JSONB                    NOT NULL,
    event_number    INTEGER                  NOT NULL,
    global_sequence BIGINT                   NOT NULL DEFAULT nextval('global_event_sequence'),
    timestamp       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    version         INTEGER                  NOT NULL DEFAULT 1,

    CONSTRAINT uq_events_aggregate_event UNIQUE (aggregate_id, event_number)
);

CREATE INDEX IF NOT EXISTS idx_events_aggregate_id      ON events (aggregate_id);
CREATE INDEX IF NOT EXISTS idx_events_global_sequence   ON events (global_sequence);
CREATE INDEX IF NOT EXISTS idx_events_timestamp         ON events (timestamp);

-- ---------------------------------------------------------------------------
-- SNAPSHOTS - Periodic aggregate state snapshots for performance
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS snapshots (
    snapshot_id       UUID         PRIMARY KEY NOT NULL,
    aggregate_id      VARCHAR(255) NOT NULL    UNIQUE,
    snapshot_data     JSONB        NOT NULL,
    last_event_number INTEGER      NOT NULL,
    created_at        TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate_id ON snapshots (aggregate_id);

-- ---------------------------------------------------------------------------
-- READ MODEL - Account summaries projection
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_summaries (
    account_id  VARCHAR(255)   PRIMARY KEY NOT NULL,
    owner_name  VARCHAR(255)   NOT NULL,
    balance     DECIMAL(19, 4) NOT NULL DEFAULT 0,
    currency    VARCHAR(3)     NOT NULL DEFAULT 'USD',
    status      VARCHAR(50)    NOT NULL DEFAULT 'OPEN',
    version     BIGINT         NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------------
-- READ MODEL - Transaction history projection
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS transaction_history (
    transaction_id  VARCHAR(255)             PRIMARY KEY NOT NULL,
    account_id      VARCHAR(255)             NOT NULL,
    type            VARCHAR(50)              NOT NULL,
    amount          DECIMAL(19, 4)           NOT NULL,
    description     TEXT,
    timestamp       TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_transaction_history_account_id ON transaction_history (account_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_timestamp   ON transaction_history (timestamp);

-- ---------------------------------------------------------------------------
-- PROJECTION TRACKING - Tracks which events each projector has processed
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projection_tracking (
    projection_name                  VARCHAR(255)             PRIMARY KEY NOT NULL,
    last_processed_global_sequence   BIGINT                   NOT NULL DEFAULT 0,
    updated_at                       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Seed the known projections
INSERT INTO projection_tracking (projection_name, last_processed_global_sequence)
VALUES
    ('AccountSummaries',   0),
    ('TransactionHistory', 0)
ON CONFLICT (projection_name) DO NOTHING;
