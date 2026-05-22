// Direct read-only calls into the fundstacks-rewards contract via Hiro's
// /v2/contracts/call-read endpoint. Follows the donor-badges-reads pattern.
//
// The issuance curve is mirrored in JS (computeRewards) so the UI can
// preview a donor's FSTR earnings without an extra RPC. The constants below
// must stay in sync with RATE_SCALE / RATE_MIN / RATE_SPREAD in the contract.
// If an admin ever calls set-sbtc-rate the JS sBTC default will drift; callers
// that need exact parity should use previewRewardsOnChain.

import {
  ClarityValue,
  cvToHex,
  hexToCV,
  principalCV,
  uintCV,
} from "@stacks/transactions";
import { FUNDSTACKS_REWARDS_CONTRACT } from "@/constants/contracts";
import { getStacksUrl } from "@/lib/stacks-api";

const READONLY_SENDER = "SP000000000000000000002Q6VF78";

type HiroReadOnlyResponse =
  | { okay: true; result: string }
  | { okay: false; cause: string };

async function callReadOnly(
  functionName: string,
  args: ClarityValue[] = []
): Promise<ClarityValue> {
  const url = `${getStacksUrl()}/v2/contracts/call-read/${FUNDSTACKS_REWARDS_CONTRACT.address}/${FUNDSTACKS_REWARDS_CONTRACT.name}/${functionName}`;
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

interface ResponseCVShape {
  type: string;
  value: ClarityValue;
}

interface UIntCVShape {
  type: string;
  value: bigint;
}

interface BoolCVShape {
  type: "true" | "false";
}

function unwrapResponse(cv: ClarityValue): ClarityValue {
  const r = cv as unknown as ResponseCVShape;
  if (r.type === "ok") return r.value;
  if (r.type === "err") {
    const inner = r.value as unknown as UIntCVShape;
    throw new Error(`fundstacks-rewards contract returned err u${inner.value}`);
  }
  return cv;
}

function asUint(cv: ClarityValue): bigint {
  return (cv as unknown as UIntCVShape).value;
}

function asBool(cv: ClarityValue): boolean {
  return (cv as unknown as BoolCVShape).type === "true";
}

// -- Issuance curve constants (mirrors fundstacks-rewards.clar) --

const RATE_SCALE = BigInt(1000);
const RATE_MIN = BigInt(1000);
const RATE_SPREAD = BigInt(9000);

export const REWARDS_DECIMALS = 6;
export const MICRO_FSTR_PER_FSTR = BigInt(1_000_000);

export const DEFAULT_SBTC_NUMERATOR: bigint = BigInt(100);
export const DEFAULT_SBTC_DENOMINATOR: bigint = BigInt(1);

// Mirror of fundstacks-rewards.clar `compute-tokens`. All values in microunits.
// Returns micro-FSTR (divide by MICRO_FSTR_PER_FSTR to display as FSTR).
export function computeRewards(
  contributionStxEq: bigint,
  campaignGoal: bigint,
  campaignTotalStx: bigint
): bigint {
  if (campaignGoal === BigInt(0)) return BigInt(0);
  const progress =
    campaignTotalStx >= campaignGoal
      ? BigInt(100)
      : (campaignTotalStx * BigInt(100)) / campaignGoal;
  const rate = RATE_MIN + (RATE_SPREAD * (BigInt(100) - progress)) / BigInt(100);
  return (contributionStxEq * rate) / RATE_SCALE;
}

// Compute the STX-equivalent of a mixed STX + sBTC donation for reward preview.
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

export async function getFstrBalance(who: string): Promise<bigint> {
  const cv = await callReadOnly("get-balance", [principalCV(who)]);
  return asUint(unwrapResponse(cv));
}

export async function getFstrTotalSupply(): Promise<bigint> {
  const cv = await callReadOnly("get-total-supply");
  return asUint(unwrapResponse(cv));
}

export async function hasClaimed(
  campaignId: bigint | number,
  donor: string
): Promise<boolean> {
  const cv = await callReadOnly("has-claimed", [
    uintCV(BigInt(campaignId)),
    principalCV(donor),
  ]);
  return asBool(cv);
}

// Calls the contract's preview-rewards read-only function. More accurate than
// computeRewards after an admin set-sbtc-rate call. Falls back to null on RPC
// failure so callers can degrade to the JS-side computation.
export async function previewRewardsOnChain(
  contributionStxEq: bigint,
  campaignGoal: bigint,
  campaignTotalStx: bigint
): Promise<bigint | null> {
  try {
    const cv = await callReadOnly("preview-rewards", [
      uintCV(contributionStxEq),
      uintCV(campaignGoal),
      uintCV(campaignTotalStx),
    ]);
    return asUint(unwrapResponse(cv));
  } catch {
    return null;
  }
}
