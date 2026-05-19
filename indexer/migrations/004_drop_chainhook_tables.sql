-- Drop the legacy chainhook-fed event store.
--
-- Migrations 001 (chainhook_deliveries + fundraising_events) and 002
-- (regex backfill of fundraising_events.campaign_id / amount) were
-- removed in the indexer rewrite. All routes now read directly from
-- the contract; nothing references these tables anymore.
--
-- IF EXISTS keeps this idempotent and a no-op for fresh installs that
-- never ran the old migrations. CASCADE drops the related indexes.

DROP TABLE IF EXISTS fundraising_events CASCADE;
DROP TABLE IF EXISTS chainhook_deliveries CASCADE;
