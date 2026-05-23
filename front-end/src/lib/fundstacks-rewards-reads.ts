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

interface AsciiCVShape {
  type: "ascii";
  value: string;
}

interface PrincipalCVShape {
  type: "address";
  value: string;
}

interface TupleCVShape {
  type: "tuple";
  value: Record<string, unknown>;
}

interface HiroContractLogEvent {
  tx_id: string;
  contract_log?: {
    topic: string;
    value: { hex: string };
  };
}

interface HiroEventsResponse {
  results: HiroContractLogEvent[];
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

// Reads the rewards contract print events and returns the minted amount for a
// donor's campaign claim. Returns null when not found or if event fetch fails.
export async function getClaimedRewardsAmount(
  campaignId: bigint | number,
  donor: string
): Promise<bigint | null> {
  const targetCampaignId = BigInt(campaignId);
  const normalizedDonor = donor.toLowerCase();
  const contractId = `${FUNDSTACKS_REWARDS_CONTRACT.address}.${FUNDSTACKS_REWARDS_CONTRACT.name}`;
  const pageSize = 50;

  try {
    for (let offset = 0; offset <= 5000; offset += pageSize) {
      const url = `${getStacksUrl()}/extended/v1/contract/${contractId}/events?limit=${pageSize}&offset=${offset}`;
      const res = await fetch(url);
      if (!res.ok) break;
      const data = (await res.json()) as HiroEventsResponse;
      const page = data.results ?? [];
      if (page.length === 0) break;

      for (const raw of page) {
        if (!raw.contract_log || raw.contract_log.topic !== "print") continue;
        const cv = hexToCV(raw.contract_log.value.hex) as unknown as TupleCVShape;
        if (cv.type !== "tuple") continue;
        const fields = cv.value;

        const eventName = (fields.event as AsciiCVShape | undefined)?.value;
        if (eventName !== "rewards-earned") continue;

        const eventCampaignId = (fields.campaignId as UIntCVShape | undefined)?.value;
        const eventDonor = (fields.donor as PrincipalCVShape | undefined)?.value;
        const eventTokens = (fields.tokens as UIntCVShape | undefined)?.value;
        if (
          eventCampaignId === undefined ||
          !eventDonor ||
          eventTokens === undefined
        ) {
          continue;
        }

        if (
          eventCampaignId === targetCampaignId &&
          eventDonor.toLowerCase() === normalizedDonor
        ) {
          return eventTokens;
        }
      }

      if (page.length < pageSize) break;
    }
  } catch {
    return null;
  }

  return null;
}
