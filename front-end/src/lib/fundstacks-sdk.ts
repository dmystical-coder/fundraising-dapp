import {
  buildDonateTx,
  type BuildDonateTxInput,
  createClient,
} from "@dmystical-coder/fundstacks-headless-sdk";
import { FUNDRAISING_CONTRACT, SBTC_CONTRACT } from "@/constants/contracts";
import { getStacksNetworkString } from "@/lib/stacks-api";
import type { ContractCallOptions } from "@/lib/contract-utils";
import { PostConditionMode, type PostCondition } from "@stacks/transactions";

const network = getStacksNetworkString();

// The SDK's defaultSbtcAssetForNetwork() returns "<address>.sbtc-token" without
// the "::sbtc-token" asset-name suffix, which serializes to an FT post-condition
// with an empty asset name and aborts every sBTC donation under Deny mode. Pass a
// fully-qualified asset id so resolveSbtcAsset() uses this instead of the default.
const sbtcAsset = `${SBTC_CONTRACT.address}.${SBTC_CONTRACT.name}::sbtc-token`;

export const fundstacksClient = createClient({
  contractAddress: FUNDRAISING_CONTRACT.address || "",
  contractName: FUNDRAISING_CONTRACT.name,
  network,
  sbtcAsset,
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
