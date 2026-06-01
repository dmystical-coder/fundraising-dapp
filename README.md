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
- **Written for Clarity 4 / epoch 3.3.** Uses the `as-contract?` allowance pattern for safe inter-contract STX and SIP-010 transfers, so each contract can only move what a public function explicitly permits. No copy-pasted boilerplate.
- **Soulbound donor proof.** A separate contract mints non-transferable SIP-009 badges to donors based on their contribution tier — so support is publicly verifiable but not resaleable.
- **Donor-governed escrow.** Creators can opt into milestone escrow: withdrawn funds are split into tranches that donors release by voting, weighted by their original contribution. Funds move only when supporters agree.

## Architecture

FundStacks is a small system of cohesive Clarity contracts that compose around the core fundraising contract. None of the companion contracts modify `fundraising`; they read its state and add product surface around it.

All seven contracts are live on Stacks mainnet under `SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH`.

| Contract | Role |
|---|---|
| [`fundraising`](https://explorer.hiro.so/txid/SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.fundraising?chain=mainnet) | Campaign lifecycle: create, cancel, donate (STX/sBTC), withdraw, refund. Source of truth for campaign state. |
| [`donor-badges`](https://explorer.hiro.so/txid/SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.donor-badges?chain=mainnet) | Soulbound SIP-009 NFT. Donors claim a Bronze/Silver/Gold badge based on their cumulative contribution to a campaign. Reads donations directly from `fundraising`. |
| [`fundstacks-rewards`](https://explorer.hiro.so/txid/SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.fundstacks-rewards?chain=mainnet) | SIP-010 reward token issued to donors with rate keyed to goal progress (early supporters of underfunded campaigns earn more per STX). |
| [`fee-splitter`](https://explorer.hiro.so/txid/SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.fee-splitter?chain=mainnet) | Routes a configurable platform fee from each donation to a protocol treasury, with optional split to a charity address per-campaign. |
| [`campaign-milestones`](https://explorer.hiro.so/txid/SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.campaign-milestones?chain=mainnet) | Opt-in trust escrow: creator deposits a portion of withdrawn funds, donors vote (weighted by their original contribution) to release tranches. |
| [`donation-source-trait`](https://explorer.hiro.so/txid/SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.donation-source-trait?chain=mainnet) · [`fundstacks-source-trait`](https://explorer.hiro.so/txid/SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH.fundstacks-source-trait?chain=mainnet) | Traits that let the badge and reward contracts read donation data from a pluggable source, so `fundraising` stays the single source of truth without the companions hard-coding it. |

Off-chain:

- **Front-end**: Next.js 15 (App Router) + React 19 + Chakra UI + TanStack Query
- **Contract reads**: `@stacks/blockchain-api-client` against Hiro's mainnet RPC
- **Off-chain metadata** (campaign title + description, since they're not on-chain): Postgres

## How it works

**Creating a campaign.** The creator picks a goal (denominated in USD for the UI, but stored as a raw uint), a deadline timestamp, and a beneficiary principal. The contract assigns a sequential `campaignId` and emits a `campaign-created` event. Title and description live off-chain because they're long-form and don't need consensus.

**Donating.** Donors send STX or sBTC to the contract via `donate-stx` or `donate-sbtc`. The contract records the donor → amount mapping per campaign per asset, so refunds work cleanly if the campaign is cancelled. Once the deadline passes, the beneficiary calls `withdraw` to receive the full balance. If the creator cancels before withdrawal, every donor can call `refund` to recover their exact contribution.

**Donor proof and rewards.** After donating, a donor can claim a soulbound badge from `donor-badges` (Bronze/Silver/Gold by cumulative contribution) and reward tokens from `fundstacks-rewards`. Both contracts read the donation record straight from `fundraising` through the source traits, so a donor can never claim more than they actually gave.

**Milestone escrow.** A creator may route withdrawn funds into `campaign-milestones` instead of taking them all at once. The escrow splits the amount into equal tranches; donors vote to release each tranche, with vote weight proportional to their original contribution. A tranche pays out only once it crosses the approval threshold — so funds follow delivery, and supporters retain leverage after the campaign closes. Tranche IDs are zero-indexed.

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

This sets up the `campaign_metadata` table for titles and descriptions. Everything else — campaign state, donations, totals, events — is read directly from the contract via Hiro's API; there is no shadow event store.

## Status

As of June 2026 the full system is live on mainnet. The four companion contracts (`donor-badges`, `fundstacks-rewards`, `fee-splitter`, `campaign-milestones`) shipped in May, each deployed independently from `SP3R3SX667CWE61113X23CAQ03SZXXZ3D8D3A4NFH`. They're additive — the original `fundraising` contract was untouched by the rollout.

## Security

The contracts have not been formally audited. Treat mainnet deployments with significant funds accordingly. The Clarity code uses Clarity 4's allowance-scoped `as-contract?` for all inter-contract token movements, so the contract can only spend what each public function explicitly permits. Issues found should be reported privately to the contact in `package.json`.

## License

[MIT](./LICENSE)

---

<p align="center">
  Built on <a href="https://stacks.co">Stacks</a>.
</p>
