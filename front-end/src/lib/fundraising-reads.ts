// Direct read-only calls into the fundraising contract via Hiro's
// /v2/contracts/call-read endpoint. The contract is the source of truth;
// nothing here caches or persists state — the Next.js route layer / React
// Query handle that.

import {
  ClarityValue,
  cvToHex,
  hexToCV,
  principalCV,
  uintCV,
} from "@stacks/transactions";
import { FUNDRAISING_CONTRACT } from "@/constants/contracts";
import { getStacksUrl } from "@/lib/stacks-api";

// Any valid principal works as the read-only sender — we use the
// canonical burn address so we never accidentally bind reads to a
// specific user's identity.
const READONLY_SENDER = "SP000000000000000000002Q6VF78";

// fundraising.clar error code: err-campaign-not-found
const ERR_CAMPAIGN_NOT_FOUND = BigInt(109);

type HiroReadOnlyResponse =
  | { okay: true; result: string }
  | { okay: false; cause: string };

async function callReadOnly(
  functionName: string,
  args: ClarityValue[] = []
): Promise<ClarityValue> {
  const url = `${getStacksUrl()}/v2/contracts/call-read/${FUNDRAISING_CONTRACT.address}/${FUNDRAISING_CONTRACT.name}/${functionName}`;
  const body = {
    sender: READONLY_SENDER,
    arguments: args.map((cv) => cvToHex(cv)),
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
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

// All read-only functions on the fundraising contract return (response T uint).
// Unwrap the (ok ...) and surface the err-code as a typed exception.
class ContractError extends Error {
  constructor(public code: bigint) {
    super(`fundraising contract returned err u${code}`);
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

// @stacks/transactions encodes booleans as { type: "true" } / { type: "false" }
// with no `.value` property.
interface BoolCVShape {
  type: "true" | "false";
}

interface PrincipalCVShape {
  type: string;
  value: string;
}

interface TupleCVShape {
  type: string;
  value: Record<string, ClarityValue>;
}

function unwrapResponse(cv: ClarityValue): ClarityValue {
  const r = cv as unknown as ResponseCVShape;
  if (r.type === "ok") return r.value;
  if (r.type === "err") {
    const inner = r.value as unknown as UIntCVShape;
    throw new ContractError(inner.value);
  }
  // Function returned a non-response value; pass through.
  return cv;
}

function asUint(cv: ClarityValue): bigint {
  return (cv as unknown as UIntCVShape).value;
}

function asBool(cv: ClarityValue): boolean {
  return (cv as unknown as BoolCVShape).type === "true";
}

function asPrincipal(cv: ClarityValue): string {
  return (cv as unknown as PrincipalCVShape).value;
}

function tupleFields(cv: ClarityValue): Record<string, ClarityValue> {
  return (cv as unknown as TupleCVShape).value;
}

// -- Public API --

export interface CampaignChainState {
  id: bigint;
  owner: string;
  beneficiary: string;
  goal: bigint;
  startBlock: bigint;
  start: bigint;
  end: bigint;
  createdAt: bigint;
  endAt: bigint;
  totalStx: bigint;
  totalSbtc: bigint;
  donationCount: bigint;
  isExpired: boolean;
  isCancelled: boolean;
  isWithdrawn: boolean;
}

export async function getLastCampaignId(): Promise<bigint> {
  const cv = await callReadOnly("get-last-campaign-id");
  return asUint(unwrapResponse(cv));
}

export async function getCampaignInfo(
  id: bigint | number
): Promise<CampaignChainState | null> {
  try {
    const cv = await callReadOnly("get-campaign-info", [uintCV(BigInt(id))]);
    const t = tupleFields(unwrapResponse(cv));
    return {
      id: asUint(t.id),
      owner: asPrincipal(t.owner),
      beneficiary: asPrincipal(t.beneficiary),
      goal: asUint(t.goal),
      startBlock: asUint(t.startBlock),
      start: asUint(t.start),
      end: asUint(t.end),
      createdAt: asUint(t.createdAt),
      endAt: asUint(t.endAt),
      totalStx: asUint(t.totalStx),
      totalSbtc: asUint(t.totalSbtc),
      donationCount: asUint(t.donationCount),
      isExpired: asBool(t.isExpired),
      isCancelled: asBool(t.isCancelled),
      isWithdrawn: asBool(t.isWithdrawn),
    };
  } catch (e) {
    if (e instanceof ContractError && e.code === ERR_CAMPAIGN_NOT_FOUND) {
      return null;
    }
    throw e;
  }
}

export async function getStxDonation(
  campaignId: bigint | number,
  donor: string
): Promise<bigint> {
  const cv = await callReadOnly("get-stx-donation", [
    uintCV(BigInt(campaignId)),
    principalCV(donor),
  ]);
  return asUint(unwrapResponse(cv));
}

export async function getSbtcDonation(
  campaignId: bigint | number,
  donor: string
): Promise<bigint> {
  const cv = await callReadOnly("get-sbtc-donation", [
    uintCV(BigInt(campaignId)),
    principalCV(donor),
  ]);
  return asUint(unwrapResponse(cv));
}

// Convenience: fetch every campaign from id=1 to last-campaign-id in parallel.
// Filters out nulls (campaigns that returned err-campaign-not-found, which
// shouldn't happen for sequential ids but the type is honest).
export async function listAllCampaigns(): Promise<CampaignChainState[]> {
  const last = await getLastCampaignId();
  const lastNum = Number(last);
  if (lastNum === 0) return [];
  const ids = Array.from({ length: lastNum }, (_, i) => BigInt(i + 1));
  const results = await Promise.all(ids.map((id) => getCampaignInfo(id)));
  return results.filter((c): c is CampaignChainState => c !== null);
}
