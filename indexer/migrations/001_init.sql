-- Minimal schema for ingesting Chainhook deliveries and extracting fundraising print events.

CREATE TABLE IF NOT EXISTS chainhook_deliveries (
  id BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hook_uuid TEXT NULL,
  chain TEXT NULL,
  network TEXT NULL,
  action TEXT NULL,
  block_height BIGINT NULL,
  txid TEXT NULL,
  contract_identifier TEXT NULL,
  event_uid TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS chainhook_deliveries_txid_idx ON chainhook_deliveries(txid);
CREATE INDEX IF NOT EXISTS chainhook_deliveries_contract_idx ON chainhook_deliveries(contract_identifier);

CREATE TABLE IF NOT EXISTS fundraising_events (
  id BIGSERIAL PRIMARY KEY,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_uid TEXT NOT NULL UNIQUE,
  event_name TEXT NOT NULL,
  campaign_id BIGINT NULL,
  donor TEXT NULL,
  owner TEXT NULL,
  beneficiary TEXT NULL,
  token TEXT NULL,
  amount BIGINT NULL,
  ts BIGINT NULL,
  txid TEXT NULL,
  block_height BIGINT NULL,
  contract_identifier TEXT NULL,
  raw JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS fundraising_events_campaign_idx ON fundraising_events(campaign_id);
CREATE INDEX IF NOT EXISTS fundraising_events_name_idx ON fundraising_events(event_name);
CREATE INDEX IF NOT EXISTS fundraising_events_txid_idx ON fundraising_events(txid);
