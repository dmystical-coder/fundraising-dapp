# Chainhook (Mainnet) Integration

This repo’s Clarity contract emits event-like logs via `print`.
Chainhook can watch those print events and POST matching payloads to a webhook.

## 1) Deploy contract on mainnet

Once deployed, you’ll have a contract identifier like:

- `SPXXXXXXXXXXXXXXX.fundraising`

Update these placeholders:

- `chainhooks/predicates/fundraising-print-events.json` → `contract_identifier`
- `indexer/.env` → `EXPECTED_CONTRACT_IDENTIFIER`

## 2) Run Postgres

Example (local):

- `createdb fundraising`
- set `DATABASE_URL` in `indexer/.env`

Then run migrations:

- `cd indexer`
- `cp .env.example .env`
- `npm run build`
- `npm run db:migrate`

## 3) Run the webhook indexer

- `cd indexer`
- `npm run dev`

It exposes:

- `GET /health`
- `POST /chainhook`

If `CHAINHOOK_AUTH_TOKEN` is set, the indexer requires:

- `Authorization: Bearer <CHAINHOOK_AUTH_TOKEN>`

## 4) Register a Hiro-hosted chainhook (recommended)

This repo now supports registering a mainnet/testnet chainhook using the Hiro Chainhooks API via `@hirosystems/chainhooks-client`.

Important constraints:

- Your webhook URL must be publicly reachable (Hiro will POST to it). For local testing, use a tunnel (ngrok/cloudflared).
- The hosted Chainhooks API schema does **not** support custom headers for `http_post`, so you cannot send `Authorization`.
  If you require auth headers, use the Rust chainhook service method below.

Steps:

- `cd indexer`
- `cp .env.example .env`
- Set:
  - `CHAINHOOKS_API_KEY` (or `CHAINHOOKS_JWT`)
  - `CHAINHOOKS_NETWORK` (`mainnet` or `testnet`)
  - `CHAINHOOKS_WEBHOOK_URL` (public URL to your indexer `/chainhook` endpoint)
  - `EXPECTED_CONTRACT_IDENTIFIER` (your deployed `SP...fundraising`)
- Register:
  - `npm run chainhooks:register`

Once registered, Hiro will start POSTing matching Stacks `contract_log` events to your webhook.

## 5) (Alternative) Run Rust Chainhook service (mainnet)

Install Chainhook (see HiroSystems/chainhook). Then:

- `chainhook config new --mainnet`
- edit the generated toml with your preferred settings

Start the service with your predicate:

- `chainhook service start --config-path ./Chainhook.toml --predicate-path ./chainhooks/predicates/fundraising-print-events.json`

## 6) Repair `fundraising_events` from raw deliveries

If `fundraising_events` is missing rows (e.g. after an `event_uid` dedup bug), you can **rebuild** it from `chainhook_deliveries` using the current extraction and UID logic (same as `front-end/src/lib/chainhook.ts` and `POST /api/chainhook`):

```bash
cd front-end
npm install
# Preview counts only
npm run db:replay-fundraising-events -- --dry-run
# Applies: TRUNCATE fundraising_events, then re-inserts from all stored payloads
npm run db:replay-fundraising-events
```

(`npx tsx scripts/replay-fundraising-events.ts` is equivalent to the `npm run` form.)

Set `DATABASE_URL` in `front-end/.env.local` (or the environment) and optional `EXPECTED_CONTRACT_IDENTIFIER` to match the webhook. The apply path **wipes and repopulates** `fundraising_events` only; `chainhook_deliveries` and `campaign_metadata` are unchanged. Inserts use **autocommit** (not one long open transaction) so serverless/Neon limits are less likely to drop the connection. If a run fails after `TRUNCATE`, re-run the script to rebuild from `chainhook_deliveries`.

## Notes

- This indexer is intentionally minimal and stores the raw delivery in Postgres.
- It also performs best-effort extraction of fundraising `print` logs into `fundraising_events`.
- For production, you typically want to handle reorg rollbacks explicitly (Chainhook is reorg-aware).
