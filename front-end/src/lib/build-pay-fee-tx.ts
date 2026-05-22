// Tx builders for fee-splitter.pay-fee-stx and pay-fee-sbtc.
// The contract takes the full donation amount and computes the fee
// internally (amount * fee-bps / 10000). Callers must hold enough
// STX/sBTC to cover the fee portion.

import { PostConditionMode, uintCV } from "@stacks/transactions";
import type { ContractCallOptions } from "@/lib/contract-utils";
import { FEE_SPLITTER_CONTRACT } from "@/constants/contracts";

interface BuildPayFeeTxInput {
  campaignId: bigint | number;
  amount: bigint | number;
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

export function buildPayFeeStxTx(input: BuildPayFeeTxInput): ContractCallOptions {
  return {
    contractAddress: FEE_SPLITTER_CONTRACT.address || "",
    contractName: FEE_SPLITTER_CONTRACT.name,
    functionName: "pay-fee-stx",
    functionArgs: [uintCV(BigInt(input.campaignId)), uintCV(BigInt(input.amount))],
    postConditions: [],
    postConditionMode: PostConditionMode.Allow,
    onFinish: input.onFinish,
    onCancel: input.onCancel,
  };
}

export function buildPayFeeSbtcTx(input: BuildPayFeeTxInput): ContractCallOptions {
  return {
    contractAddress: FEE_SPLITTER_CONTRACT.address || "",
    contractName: FEE_SPLITTER_CONTRACT.name,
    functionName: "pay-fee-sbtc",
    functionArgs: [uintCV(BigInt(input.campaignId)), uintCV(BigInt(input.amount))],
    postConditions: [],
    postConditionMode: PostConditionMode.Allow,
    onFinish: input.onFinish,
    onCancel: input.onCancel,
  };
}
