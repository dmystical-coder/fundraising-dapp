<p align="center">
  <img width="1892" height="851" alt="image" src="https://github.com/user-attachments/assets/76585ede-498e-4266-a23e-7ce252b3ab55" />
</p>

<h1 align="center">FundStacks</h1>

<p align="center">
  <strong>Professional, transparent crowdfunding on Stacks</strong>
</p>

---

## Overview

FundStacks is a decentralized crowdfunding app on [Stacks](https://stacks.co).
Creators launch campaigns with USD goals, donors contribute in STX or sBTC, and campaign outcomes are enforced on-chain.

## Why FundStacks

- **Transparent by default**: donations and campaign state changes are recorded on-chain
- **Dual-asset support**: accept both STX and sBTC
- **Creator + donor dashboard**: track campaigns, donations, and status in one place
- **Fast discovery UX**: indexed activity, campaign metadata, and leaderboard/stat endpoints

## For Creators and Donors

1. Connect a Stacks wallet
2. Create or browse campaigns
3. Donate in STX/sBTC or manage your active campaigns
4. Withdraw/refund based on contract state

## Product + Technical Snapshot

- **On-chain (Clarity)**: campaign lifecycle (`create`, `cancel`, `donate`, `withdraw`, `refund`)
- **Off-chain metadata**: campaign title/description in `campaign_metadata`
- **Event indexing**: chainhook deliveries + parsed events in PostgreSQL for feeds and analytics
- **Frontend**: Next.js + React + Chakra UI + React Query

## Local Development

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL (local or hosted)
- Stacks-compatible wallet for manual testing

### 1) Frontend

```bash
cd front-end
npm install
cp .env.example .env.local
```

Set in `.env.local`:
- `NEXT_PUBLIC_STACKS_NETWORK` (`devnet`, `testnet`, `mainnet`)
- `DATABASE_URL`
- optional deployer and chainhook filter values

### 2) Database + Indexer

```bash
cd indexer
npm install
cp .env.example .env
npm run db:migrate
```

### 3) Run

```bash
cd front-end
npm run dev
```

Open `http://localhost:3000`.

## Chainhook Integration

For production-style event ingestion:

- configure `EXPECTED_CONTRACT_IDENTIFIER` and webhook URL
- register with Hiro Chainhooks API from `indexer/`
- ingest payloads via `front-end/src/app/api/chainhook/route.ts`

Detailed setup: [`chainhooks/README.md`](./chainhooks/README.md)

## Testing

Run contract tests:

```bash
cd clarity
npm install
npm run test
```

## License

This project is available under the [MIT License](LICENSE).

## Security

Audit and operational hardening are recommended before deploying to mainnet with significant funds.

---

<p align="center">
  Built on <a href="https://stacks.co">Stacks</a>
</p>
