import { PostConditionMode, uintCV } from "@stacks/transactions";
import type { ContractCallOptions } from "@/lib/contract-utils";
import { CAMPAIGN_MILESTONES_CONTRACT } from "@/constants/contracts";

export interface BuildClaimTrancheTxInput {
  campaignId: bigint | number;
  trancheId: bigint | number;
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

// claim-tranche(campaign-id, tranche-id) → (response uint uint)
// Owner-only. Pays exactly tranche-amount STX to caller.
export function buildClaimTrancheTx(
  input: BuildClaimTrancheTxInput
): ContractCallOptions {
  return {
    contractAddress: CAMPAIGN_MILESTONES_CONTRACT.address || "",
    contractName: CAMPAIGN_MILESTONES_CONTRACT.name,
    functionName: "claim-tranche",
    functionArgs: [
      uintCV(BigInt(input.campaignId)),
      uintCV(BigInt(input.trancheId)),
    ],
    postConditions: [],
    postConditionMode: PostConditionMode.Allow,
    onFinish: input.onFinish,
    onCancel: input.onCancel,
  };
}
