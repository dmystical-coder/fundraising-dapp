// Builds the contract-call options for claim-badge on the donor-badges
// contract. Returns a ContractCallOptions compatible with the existing
// executeContractCall (devnet) / openContractCall (testnet/mainnet) wallet
// flows used by the donor badge claim UI.

import {
  contractPrincipalCV,
  PostConditionMode,
  uintCV,
} from "@stacks/transactions";
import type { ContractCallOptions } from "@/lib/contract-utils";
import {
  DONOR_BADGES_CONTRACT,
  FUNDRAISING_CONTRACT,
} from "@/constants/contracts";

export interface BuildClaimBadgeTxInput {
  campaignId: bigint | number;
  onFinish?: (data: { txId: string }) => void;
  onCancel?: () => void;
}

// claim-badge takes (source <donation-source>) (campaignId uint).
// The fundraising contract implements donation-source-trait, so the
// trait arg is always the live fundraising contract principal.
//
// No post-conditions: claim-badge mints (or upgrades) an NFT in this
// contract and does not move STX or sBTC. PostConditionMode.Deny would
// reject the tx unnecessarily; PostConditionMode.Allow with an empty
// post-condition list is the right shape for "this tx moves nothing".
export function buildClaimBadgeTx(
  input: BuildClaimBadgeTxInput
): ContractCallOptions {
  return {
    contractAddress: DONOR_BADGES_CONTRACT.address || "",
    contractName: DONOR_BADGES_CONTRACT.name,
    functionName: "claim-badge",
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
