import {
  ClarityValue,
  cvToHex,
  hexToCV,
  principalCV,
  uintCV,
} from "@stacks/transactions";
import { CAMPAIGN_MILESTONES_CONTRACT } from "@/constants/contracts";
import { getStacksUrl } from "@/lib/stacks-api";

const READONLY_SENDER = "SP000000000000000000002Q6VF78";

type HiroReadOnlyResponse =
  | { okay: true; result: string }
  | { okay: false; cause: string };

async function callReadOnly(
  functionName: string,
  args: ClarityValue[] = []
): Promise<ClarityValue> {
  const url = `${getStacksUrl()}/v2/contracts/call-read/${CAMPAIGN_MILESTONES_CONTRACT.address}/${CAMPAIGN_MILESTONES_CONTRACT.name}/${functionName}`;
  const body = {
    sender: READONLY_SENDER,
    arguments: args.map((cv) => cvToHex(cv)),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok)
    throw new Error(
      `campaign-milestones read failed for ${functionName}: HTTP ${res.status}`
    );
  const data = (await res.json()) as HiroReadOnlyResponse;
  if (data.okay === false)
    throw new Error(
      `campaign-milestones read rejected for ${functionName}: ${data.cause}`
    );
  return hexToCV(data.result);
}

interface UIntCVShape {
  type: string;
  value: bigint;
}
interface BoolCVShape {
  type: "true" | "false";
}
interface TupleCVShape {
  type: string;
  value: Record<string, ClarityValue>;
}
interface OptionalCVShape {
  type: "some" | "none";
  value?: ClarityValue;
}
interface PrincipalCVShape {
  type: string;
  value: string;
}

function asUint(cv: ClarityValue): bigint {
  return (cv as unknown as UIntCVShape).value;
}
function asBool(cv: ClarityValue): boolean {
  return (cv as unknown as BoolCVShape).type === "true";
}
function tupleFields(cv: ClarityValue): Record<string, ClarityValue> {
  return (cv as unknown as TupleCVShape).value;
}
function asPrincipal(cv: ClarityValue): string {
  return (cv as unknown as PrincipalCVShape).value;
}
function unwrapOptional<T>(
  cv: ClarityValue,
  decode: (inner: ClarityValue) => T
): T | null {
  const o = cv as unknown as OptionalCVShape;
  if (o.type === "none" || o.value === undefined) return null;
  return decode(o.value);
}

export interface EscrowInfo {
  owner: string;
  balance: bigint;
  trancheCount: bigint;
  trancheAmount: bigint;
  releaseThreshold: bigint;
  createdAt: bigint;
}

export interface TrancheInfo {
  voteWeight: bigint;
  released: boolean;
  claimed: boolean;
}

export async function getEscrowInfo(
  campaignId: number | bigint
): Promise<EscrowInfo | null> {
  const cv = await callReadOnly("get-escrow-info", [uintCV(BigInt(campaignId))]);
  return unwrapOptional(cv, (inner) => {
    const t = tupleFields(inner);
    return {
      owner: asPrincipal(t.owner),
      balance: asUint(t.balance),
      trancheCount: asUint(t["tranche-count"]),
      trancheAmount: asUint(t["tranche-amount"]),
      releaseThreshold: asUint(t["release-threshold"]),
      createdAt: asUint(t["created-at"]),
    };
  });
}

export async function getTrancheInfo(
  campaignId: number | bigint,
  trancheId: number | bigint
): Promise<TrancheInfo | null> {
  const cv = await callReadOnly("get-tranche-info", [
    uintCV(BigInt(campaignId)),
    uintCV(BigInt(trancheId)),
  ]);
  return unwrapOptional(cv, (inner) => {
    const t = tupleFields(inner);
    return {
      voteWeight: asUint(t["vote-weight"]),
      released: asBool(t.released),
      claimed: asBool(t.claimed),
    };
  });
}

export async function hasVoted(
  campaignId: number | bigint,
  trancheId: number | bigint,
  donor: string
): Promise<boolean> {
  const cv = await callReadOnly("has-voted", [
    uintCV(BigInt(campaignId)),
    uintCV(BigInt(trancheId)),
    principalCV(donor),
  ]);
  return asBool(cv);
}
