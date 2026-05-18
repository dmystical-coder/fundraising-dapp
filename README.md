<p align="center">
  <img width="1892" height="851" alt="FundStacks dashboard" src="https://github.com/user-attachments/assets/76585ede-498e-4266-a23e-7ce252b3ab55" />
</p>

<h1 align="center">FundStacks</h1>

<p align="center">
  Crowdfunding on Stacks. Donate in STX or sBTC. On-chain end to end.
</p>

<p align="center">
  <a href="https://fundstacks.vercel.app/">Live app</a>
  ·
  <a href="https://explorer.hiro.so/txid/SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.fundraising?chain=mainnet">Mainnet contract</a>
</p>

---

## What it is

FundStacks is a crowdfunding dApp on [Stacks](https://stacks.co), the Bitcoin L2 for smart contracts. Creators launch campaigns with a goal and a deadline. Donors contribute in STX or sBTC. The Clarity contract holds the funds, tracks every donation, and enforces the outcome: withdrawal to the beneficiary when the campaign ends, or per-donor refunds if it's cancelled. No platform custody, no off-chain ledger pretending to be the truth.

## What's different about it

- **Dual-asset, same campaign.** A single campaign accepts both STX (microstacks) and sBTC (sats). The contract tracks each donor's per-asset contribution separately and refunds in kind.
- **Outcome enforced on-chain.** Withdraw and refund are public functions gated by contract state, not platform code. The campaign owner can cancel, the beneficiary can withdraw after the deadline, donors can refund when cancelled — and that's it. Nothing else can move the funds.
- **Originally written for Clarity 4 / epoch 3.3.** Uses the new `as-contract?` allowance pattern for safe inter-contract STX and SIP-010 transfers. No copy-pasted boilerplate.
- **Soulbound donor proof (in progress).** A separate contract mints non-transferable badges to donors based on their contribution tier — so support is publicly verifiable but not resaleable.

## Architecture

FundStacks is a small system of cohesive Clarity contracts that compose around the core fundraising contract. None of the companion contracts modify `fundraising`; they read its state and add product surface around it.

| Contract | Role | Status |
|---|---|---|
| `fundraising` | Campaign lifecycle: create, cancel, donate (STX/sBTC), withdraw, refund. Source of truth for campaign state. | **Live** ([explorer](https://explorer.hiro.so/txid/SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.fundraising?chain=mainnet)) |
| `donor-badges` | Soulbound SIP-009 NFT. Donors claim a Bronze/Silver/Gold badge based on their cumulative contribution to a campaign. Reads donations directly from `fundraising`. | In progress |
| `fundstacks-rewards` | SIP-010 reward token issued to donors with rate keyed to goal progress (early supporters of underfunded campaigns earn more per STX). | Planned |
| `fee-splitter` | Routes a configurable platform fee from each donation to a protocol treasury, with optional split to a charity address per-campaign. | Planned |
| `campaign-milestones` | Opt-in trust escrow: creator deposits portion of withdrawn funds, donors vote (weighted by their original contribution) to release tranches. | Planned |

Off-chain:

- **Front-end**: Next.js 14 (App Router) + React 18 + Chakra UI + TanStack Query
- **Contract reads**: `@stacks/blockchain-api-client` against Hiro's mainnet RPC
- **Off-chain metadata** (campaign title + description, since they're not on-chain): Postgres

## How it works

**Creating a campaign.** The creator picks a goal (denominated in USD for the UI, but stored as a raw uint), a deadline timestamp, and a beneficiary principal. The contract assigns a sequential `campaignId` and emits a `campaign-created` event. Title and description live off-chain because they're long-form and don't need consensus.

**Donating.** Donors send STX or sBTC to the contract via `donate-stx` or `donate-sbtc`. The contract records the donor → amount mapping per campaign per asset, so refunds work cleanly if the campaign is cancelled. Once the deadline passes, the beneficiary calls `withdraw` to receive the full balance. If the creator cancels before withdrawal, every donor can call `refund` to recover their exact contribution.

## Local development

### Prerequisites

- Node 18+
- Postgres (local or hosted) for the off-chain metadata table
- A Stacks-compatible wallet (Leather, Xverse) for manual testing
- [Clarinet](https://docs.hiro.so/stacks/clarinet) for the contract dev loop

### Front-end

```bash
cd front-end
npm install
cp .env.example .env.local
# set NEXT_PUBLIC_STACKS_NETWORK and DATABASE_URL
npm run dev
```

Open `http://localhost:3000`.

### Contracts

```bash
cd clarity
npm install
clarinet check                          # type-check all contracts
npm test                                # run the vitest + clarinet-sdk suite
```

To deploy to mainnet, copy `clarity/settings/Mainnet.toml.example` to `Mainnet.toml`, fill in your 24-word mnemonic (it's gitignored), then run a deployment plan from `clarity/deployments/`.

### Off-chain metadata DB

```bash
cd indexer
npm install
cp .env.example .env
npm run db:migrate
```

This sets up the `campaign_metadata` table for titles and descriptions. (Historical note: an earlier version of this app ingested chainhook deliveries into a `fundraising_events` table. That's being deprecated in favour of direct on-chain reads — see [`chainhooks/README.md`](./chainhooks/README.md) if you need the legacy path.)

## Roadmap — May 2026

The companion contracts (`donor-badges`, `fundstacks-rewards`, `fee-splitter`, `campaign-milestones`) are shipping this month. Each is a separate contract, deployed independently to mainnet from `SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH`. They're additive — the existing `fundraising` contract on mainnet is untouched.

## Security

The contracts have not been formally audited. Treat mainnet deployments with significant funds accordingly. The Clarity code uses Clarity 4's allowance-scoped `as-contract?` for all inter-contract token movements, so the contract can only spend what each public function explicitly permits. Issues found should be reported privately to the contact in `package.json`.

## License

[MIT](./LICENSE)

---

<p align="center">
  Built on <a href="https://stacks.co">Stacks</a>.
</p>
