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

export interface BuildCreateEscrowTxInput {
  campaignId: bigint | number;
  amount: bigint | number;
  trancheCount: bigint | number;
  releaseThreshold: bigint | number;
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

// create-escrow(source, campaign-id, amount, tranche-count, release-threshold)
// Transfers `amount` µSTX from the caller into the contract.
// source is always the live fundraising contract (fundstacks-source-trait impl).
export function buildCreateEscrowTx(
  input: BuildCreateEscrowTxInput
): ContractCallOptions {
  return {
    contractAddress: CAMPAIGN_MILESTONES_CONTRACT.address || "",
    contractName: CAMPAIGN_MILESTONES_CONTRACT.name,
    functionName: "create-escrow",
    functionArgs: [
      contractPrincipalCV(
        FUNDRAISING_CONTRACT.address || "",
        FUNDRAISING_CONTRACT.name
      ),
      uintCV(BigInt(input.campaignId)),
      uintCV(BigInt(input.amount)),
      uintCV(BigInt(input.trancheCount)),
      uintCV(BigInt(input.releaseThreshold)),
    ],
    postConditions: [],
    postConditionMode: PostConditionMode.Allow,
    onFinish: input.onFinish,
    onCancel: input.onCancel,
  };
}
