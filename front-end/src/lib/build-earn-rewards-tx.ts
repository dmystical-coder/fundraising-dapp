// Builds the contract-call options for earn-rewards on the fundstacks-rewards
// contract. Returns a ContractCallOptions compatible with the existing
// executeContractCall (devnet) / openContractCall (testnet/mainnet) flows.

import {
  contractPrincipalCV,
  PostConditionMode,
  uintCV,
} from "@stacks/transactions";
import type { ContractCallOptions } from "@/lib/contract-utils";
import {
  FUNDRAISING_CONTRACT,
  FUNDSTACKS_REWARDS_CONTRACT,
} from "@/constants/contracts";

export interface BuildEarnRewardsTxInput {
  campaignId: bigint | number;
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

// earn-rewards takes (source <fundstacks-source>) (campaign-id uint).
// The fundraising contract implements fundstacks-source-trait, so the
// trait arg is always the live fundraising contract principal.
//
// No post-conditions: earn-rewards only mints FSTR to the caller and
// does not move STX or sBTC from any wallet.
export function buildEarnRewardsTx(
  input: BuildEarnRewardsTxInput
): ContractCallOptions {
  return {
    contractAddress: FUNDSTACKS_REWARDS_CONTRACT.address || "",
    contractName: FUNDSTACKS_REWARDS_CONTRACT.name,
    functionName: "earn-rewards",
    functionArgs: [
      contractPrincipalCV(
        FUNDRAISING_CONTRACT.address || "",
        FUNDRAISING_CONTRACT.name
      ),
      uintCV(BigInt(input.campaignId)),
    ],
    postConditions: [],
    postConditionMode: PostConditionMode.Allow,
    onFinish: input.onFinish,
    onCancel: input.onCancel,
  };
}
