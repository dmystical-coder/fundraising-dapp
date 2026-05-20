// Direct read-only calls into the donor-badges contract via Hiro's
// /v2/contracts/call-read endpoint. Mirrors the fundraising-reads pattern:
// the contract is the source of truth and nothing here caches or persists.
//
// Tier math is duplicated in JS so the UI can preview a tier without an
// extra RPC. The contract's tier thresholds and default sBTC rate are
// constants -- if either changes via admin call (set-sbtc-rate), the
// preview drifts from the on-chain value. Callers that need exact parity
// should read the donor's on-chain badge after they claim it.

import {
  ClarityValue,
  contractPrincipalCV,
  cvToHex,
  hexToCV,
  principalCV,
  uintCV,
} from "@stacks/transactions";
import {
  DONOR_BADGES_CONTRACT,
  FUNDRAISING_CONTRACT,
} from "@/constants/contracts";
import { getStacksUrl } from "@/lib/stacks-api";

const READONLY_SENDER = "SP000000000000000000002Q6VF78";

type HiroReadOnlyResponse =
  | { okay: true; result: string }
  | { okay: false; cause: string };

async function callReadOnly(
  functionName: string,
  args: ClarityValue[] = []
): Promise<ClarityValue> {
  const url = `${getStacksUrl()}/v2/contracts/call-read/${DONOR_BADGES_CONTRACT.address}/${DONOR_BADGES_CONTRACT.name}/${functionName}`;
  const body = {
    sender: READONLY_SENDER,
    arguments: args.map((cv) => cvToHex(cv)),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Hiro read-only call failed for ${functionName}: HTTP ${res.status}`
    );
  }
  const data = (await res.json()) as HiroReadOnlyResponse;
  if (data.okay === false) {
    throw new Error(
      `Hiro read-only call rejected for ${functionName}: ${data.cause}`
    );
  }
  return hexToCV(data.result);
}

class ContractError extends Error {
  constructor(public code: bigint) {
    super(`donor-badges contract returned err u${code}`);
  }
}

interface ResponseCVShape {
  type: string;
  value: ClarityValue;
}

interface UIntCVShape {
  type: string;
  value: bigint;
}

interface PrincipalCVShape {
  type: string;
  value: string;
}

interface TupleCVShape {
  type: string;
  value: Record<string, ClarityValue>;
}

// @stacks/transactions encodes optional CVs as { type: "some", value } or
// { type: "none" } (no value field).
interface OptionalCVShape {
  type: "some" | "none";
  value?: ClarityValue;
}

function unwrapResponse(cv: ClarityValue): ClarityValue {
  const r = cv as unknown as ResponseCVShape;
  if (r.type === "ok") return r.value;
  if (r.type === "err") {
    const inner = r.value as unknown as UIntCVShape;
    throw new ContractError(inner.value);
  }
  return cv;
}

function unwrapOptional<T>(
  cv: ClarityValue,
  decode: (inner: ClarityValue) => T
): T | null {
  const o = cv as unknown as OptionalCVShape;
  if (o.type === "none" || o.value === undefined) return null;
  return decode(o.value);
}

function asUint(cv: ClarityValue): bigint {
  return (cv as unknown as UIntCVShape).value;
}

function asPrincipal(cv: ClarityValue): string {
  return (cv as unknown as PrincipalCVShape).value;
}

function tupleFields(cv: ClarityValue): Record<string, ClarityValue> {
  return (cv as unknown as TupleCVShape).value;
}

// -- Tier math (mirrors donor-badges.clar) --

export const TIER_NONE: bigint = BigInt(0);
export const TIER_BRONZE: bigint = BigInt(1);
export const TIER_SILVER: bigint = BigInt(2);
export const TIER_GOLD: bigint = BigInt(3);

export type BadgeTier = bigint;

export const THRESHOLD_BRONZE: bigint = BigInt(1_000_000);       // 1 STX
export const THRESHOLD_SILVER: bigint = BigInt(10_000_000);      // 10 STX
export const THRESHOLD_GOLD: bigint = BigInt(100_000_000);       // 100 STX

// Default sBTC -> STX-equivalent rate baked into the contract at deploy.
// Owner can change via set-sbtc-rate; consumers that need the live rate
// should read the donor's on-chain badge tier after they claim instead of
// relying on the preview.
export const DEFAULT_SBTC_NUMERATOR: bigint = BigInt(100);
export const DEFAULT_SBTC_DENOMINATOR: bigint = BigInt(1);

export function tierForAmount(amount: bigint): BadgeTier {
  if (amount >= THRESHOLD_GOLD) return TIER_GOLD;
  if (amount >= THRESHOLD_SILVER) return TIER_SILVER;
  if (amount >= THRESHOLD_BRONZE) return TIER_BRONZE;
  return TIER_NONE;
}

export function tierLabel(tier: BadgeTier): "none" | "bronze" | "silver" | "gold" {
  if (tier === TIER_GOLD) return "gold";
  if (tier === TIER_SILVER) return "silver";
  if (tier === TIER_BRONZE) return "bronze";
  return "none";
}

export function computeStxEquivalent(
  stxAmount: bigint,
  sbtcAmount: bigint,
  numerator: bigint = DEFAULT_SBTC_NUMERATOR,
  denominator: bigint = DEFAULT_SBTC_DENOMINATOR
): bigint {
  if (denominator === BigInt(0)) return stxAmount;
  return stxAmount + (sbtcAmount * numerator) / denominator;
}

// -- Chain reads --

export interface BadgeMetadata {
  tokenId: bigint;
  owner: string;
  campaignId: bigint;
  tier: BadgeTier;
  mintedAt: bigint;
}

export async function getLastTokenId(): Promise<bigint> {
  const cv = await callReadOnly("get-last-token-id");
  return asUint(unwrapResponse(cv));
}

export async function getDonorBadgeId(
  campaignId: bigint | number,
  donor: string
): Promise<bigint | null> {
  const cv = await callReadOnly("get-donor-badge-id", [
    uintCV(BigInt(campaignId)),
    principalCV(donor),
  ]);
  return unwrapOptional(cv, asUint);
}

export async function getBadgeMetadata(
  tokenId: bigint | number
): Promise<BadgeMetadata | null> {
  const cv = await callReadOnly("get-badge-metadata", [
    uintCV(BigInt(tokenId)),
  ]);
  return unwrapOptional(cv, (inner) => {
    const t = tupleFields(inner);
    return {
      tokenId: BigInt(tokenId),
      owner: asPrincipal(t.owner),
      campaignId: asUint(t.campaignId),
      tier: asUint(t.tier) as BadgeTier,
      mintedAt: asUint(t.mintedAt),
    };
  });
}

export async function getBadgeOwner(
  tokenId: bigint | number
): Promise<string | null> {
  const cv = await callReadOnly("get-owner", [uintCV(BigInt(tokenId))]);
  return unwrapOptional(unwrapResponse(cv), asPrincipal);
}

// Calls the (public) get-donor-contribution-stx-equivalent function via
// the call-read endpoint. Hiro permits this for public functions and the
// function is effectively read-only (no var-set / map-set). Uses the
// contract's current sBTC rate, so this is more accurate than the JS
// computeStxEquivalent helper after an admin rate adjustment.
//
// Falls back to null on any RPC failure so callers can degrade gracefully
// to the JS-side computation.
export async function getDonorContributionStxEquivalent(
  campaignId: bigint | number,
  donor: string
): Promise<bigint | null> {
  try {
    const cv = await callReadOnly("get-donor-contribution-stx-equivalent", [
      contractPrincipalCV(FUNDRAISING_CONTRACT.address || "", FUNDRAISING_CONTRACT.name),
      uintCV(BigInt(campaignId)),
      principalCV(donor),
    ]);
    return asUint(unwrapResponse(cv));
  } catch {
    return null;
  }
}
