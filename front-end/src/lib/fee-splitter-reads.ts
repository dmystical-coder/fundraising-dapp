// Direct read-only calls into the fee-splitter contract.
// Follows the donor-badges-reads pattern.

import { ClarityValue, cvToHex, hexToCV, principalCV } from "@stacks/transactions";
import { FEE_SPLITTER_CONTRACT } from "@/constants/contracts";
import { getStacksUrl } from "@/lib/stacks-api";

const READONLY_SENDER = "SP000000000000000000002Q6VF78";

type HiroReadOnlyResponse =
  | { okay: true; result: string }
  | { okay: false; cause: string };

async function callReadOnly(
  functionName: string,
  args: ClarityValue[] = []
): Promise<ClarityValue> {
  const url = `${getStacksUrl()}/v2/contracts/call-read/${FEE_SPLITTER_CONTRACT.address}/${FEE_SPLITTER_CONTRACT.name}/${functionName}`;
  const body = {
    sender: READONLY_SENDER,
    arguments: args.map((cv) => cvToHex(cv)),
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`fee-splitter read failed for ${functionName}: HTTP ${res.status}`);
  const data = (await res.json()) as HiroReadOnlyResponse;
  if (data.okay === false) throw new Error(`fee-splitter read rejected for ${functionName}: ${data.cause}`);
  return hexToCV(data.result);
}

interface ResponseCVShape { type: string; value: ClarityValue }
interface UIntCVShape { type: string; value: bigint }

function unwrapResponse(cv: ClarityValue): ClarityValue {
  const r = cv as unknown as ResponseCVShape;
  if (r.type === "ok") return r.value;
  throw new Error(`fee-splitter contract error`);
}

function asUint(cv: ClarityValue): bigint {
  return (cv as unknown as UIntCVShape).value;
}

// -- JS mirror of the contract's fee computation --
// fee = amount * fee-bps / 10000

export const DEFAULT_FEE_BPS = BigInt(100); // 1%

export function computeFee(
  amount: bigint,
  feeBps: bigint = DEFAULT_FEE_BPS
): bigint {
  return (amount * feeBps) / BigInt(10000);
}

// -- Chain reads --

export async function getFeeBps(): Promise<bigint> {
  const cv = await callReadOnly("get-fee-bps");
  return asUint(unwrapResponse(cv));
}

export async function getPendingStx(who: string): Promise<bigint> {
  const cv = await callReadOnly("get-pending-stx", [principalCV(who)]);
  return asUint(unwrapResponse(cv));
}

export async function getPendingSbtc(who: string): Promise<bigint> {
  const cv = await callReadOnly("get-pending-sbtc", [principalCV(who)]);
  return asUint(unwrapResponse(cv));
}
