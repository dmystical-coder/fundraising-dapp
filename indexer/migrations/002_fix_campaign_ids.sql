-- Migration: Fix null campaign_id values by extracting from raw JSON
-- Run this against your Railway PostgreSQL database

-- Update campaign-created events
UPDATE fundraising_events
SET campaign_id = (raw->'node'->'metadata'->'value'->>'repr')::text ~ 'campaignId u(\d+)' 
    AND regexp_replace((raw->'node'->'metadata'->'value'->>'repr')::text, '.*campaignId u(\d+).*', '\1')::bigint
WHERE campaign_id IS NULL
  AND event_name = 'campaign-created';

-- More direct approach: Extract campaignId from repr using regex
UPDATE fundraising_events
SET campaign_id = (
  SELECT (regexp_matches(raw->'node'->'metadata'->'value'->>'repr', 'campaignId u(\d+)'))[1]::bigint
)
WHERE campaign_id IS NULL
  AND raw->'node'->'metadata'->'value'->>'repr' ~ 'campaignId u\d+';

-- Update amount for donation events
UPDATE fundraising_events
SET amount = (
  SELECT (regexp_matches(raw->'node'->'metadata'->'value'->>'repr', 'amount u(\d+)'))[1]::bigint
)
WHERE amount IS NULL
  AND event_name LIKE 'donated-%'
  AND raw->'node'->'metadata'->'value'->>'repr' ~ 'amount u\d+';

-- Verify the updates
SELECT 
  id, 
  event_name, 
  campaign_id, 
  amount, 
  donor, 
  owner, 
  beneficiary,
  raw->'node'->'metadata'->'value'->>'repr' as repr
FROM fundraising_events
ORDER BY id;
