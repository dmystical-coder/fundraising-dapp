import {
  buildDonateTx,
  type BuildDonateTxInput,
  createClient,
  defaultSbtcAssetForNetwork,
} from "@dmystical-coder/fundstacks-headless-sdk";
import { FUNDRAISING_CONTRACT } from "@/constants/contracts";
import { getStacksNetworkString } from "@/lib/stacks-api";
import type { ContractCallOptions } from "@/lib/contract-utils";
import { PostConditionMode, type PostCondition } from "@stacks/transactions";

const network = getStacksNetworkString();

export const fundstacksClient = createClient({
  contractAddress: FUNDRAISING_CONTRACT.address || "",
  contractName: FUNDRAISING_CONTRACT.name,
  network,
  sbtcAsset: defaultSbtcAssetForNetwork(network),
});

export const buildFundstacksDonateTx = (
  input: BuildDonateTxInput
): ContractCallOptions => {
  const tx = buildDonateTx(fundstacksClient, input);
  const postConditionMode =
    tx.postConditionMode === "allow"
      ? PostConditionMode.Allow
      : tx.postConditionMode === "deny"
      ? PostConditionMode.Deny
      : (tx.postConditionMode as PostConditionMode | undefined);

  return {
    ...tx,
    postConditions: tx.postConditions as PostCondition[] | undefined,
    postConditionMode,
  };
};
