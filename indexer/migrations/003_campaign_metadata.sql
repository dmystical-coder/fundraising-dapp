-- Migration: Add campaign metadata table for storing title/description
-- These fields are entered by users during campaign creation but not stored on-chain

CREATE TABLE IF NOT EXISTS campaign_metadata (
  campaign_id BIGINT PRIMARY KEY,
  owner TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS campaign_metadata_owner_idx ON campaign_metadata(owner);
