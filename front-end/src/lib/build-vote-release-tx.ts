import {
  contractPrincipalCV,
  PostConditionMode,
  uintCV,
} from "@stacks/transactions";
import type { ContractCallOptions } from "@/lib/contract-utils";
import {
  CAMPAIGN_MILESTONES_CONTRACT,
  FUNDRAISING_CONTRACT,
} from "@/constants/contracts";

export interface BuildVoteReleaseTxInput {
  campaignId: bigint | number;
  trancheId: bigint | number;
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

// vote-release(source, campaign-id, tranche-id) → (response uint uint)
// Adds caller's capped vote weight to the tranche. No asset movement.
export function buildVoteReleaseTx(
  input: BuildVoteReleaseTxInput
): ContractCallOptions {
  return {
    contractAddress: CAMPAIGN_MILESTONES_CONTRACT.address || "",
    contractName: CAMPAIGN_MILESTONES_CONTRACT.name,
    functionName: "vote-release",
    functionArgs: [
      contractPrincipalCV(
        FUNDRAISING_CONTRACT.address || "",
        FUNDRAISING_CONTRACT.name
      ),
      uintCV(BigInt(input.campaignId)),
      uintCV(BigInt(input.trancheId)),
    ],
    postConditions: [],
    postConditionMode: PostConditionMode.Allow,
    onFinish: input.onFinish,
    onCancel: input.onCancel,
  };
}
