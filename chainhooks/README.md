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

## 4) Run Chainhook service (mainnet)

Install Chainhook (see HiroSystems/chainhook). Then:

- `chainhook config new --mainnet`
- edit the generated toml with your preferred settings

Start the service with your predicate:

- `chainhook service start --config-path ./Chainhook.toml --predicate-path ./chainhooks/predicates/fundraising-print-events.json`

## Notes

- This indexer is intentionally minimal and stores the raw delivery in Postgres.
- It also performs best-effort extraction of fundraising `print` logs into `fundraising_events`.
- For production, you typically want to handle reorg rollbacks explicitly (Chainhook is reorg-aware).
