import { FUNDRAISING_CONTRACT, SBTC_CONTRACT } from "@/constants/contracts";
import { ContractCallOptions, Network } from "./contract-utils";
import {
  AnchorMode,
  FungiblePostCondition,
  Pc,
  PostCondition,
  PostConditionMode,
  principalCV,
  uintCV,
} from "@stacks/transactions";

interface ContributeParams {
  address: string;
  campaignId: number;
  amount: number;
}

export const getContributeStxTx = (
  network: Network,
  params: ContributeParams // Send amount in microstacks
): ContractCallOptions => {
  const { address, campaignId, amount } = params;

  return {
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    contractAddress: FUNDRAISING_CONTRACT.address || "",
    contractName: FUNDRAISING_CONTRACT.name,
    network,
    functionName: "donate-stx",
    functionArgs: [uintCV(campaignId), uintCV(amount)],
    postConditions: [Pc.principal(address).willSendEq(amount).ustx()],
  };
};

export const getContributeSbtcTx = (
  network: Network,
  params: ContributeParams // Send amount in sats
): ContractCallOptions => {
  const { address, campaignId, amount } = params;

  const postCondition: FungiblePostCondition = {
    type: "ft-postcondition",
    address,
    condition: "eq",
    asset: `${SBTC_CONTRACT.address}.${SBTC_CONTRACT.name}::sbtc-token`,
    amount,
  };

  return {
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    contractAddress: FUNDRAISING_CONTRACT.address || "",
    contractName: FUNDRAISING_CONTRACT.name,
    network,
    functionName: "donate-sbtc",
    functionArgs: [uintCV(campaignId), uintCV(amount)],
    postConditions: [postCondition],
  };
};

export const getCreateCampaignTx = (
  network: Network,
  address: string,
  goalInUSD: number,
  endAt: number = 0,
  beneficiary: string = address
): ContractCallOptions => {
  return {
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    contractAddress: FUNDRAISING_CONTRACT.address || "",
    contractName: FUNDRAISING_CONTRACT.name,
    network,
    functionName: "create-campaign",
    functionArgs: [uintCV(goalInUSD), uintCV(endAt), principalCV(beneficiary)],
    postConditions: [Pc.principal(address).willSendEq(0).ustx()],
  };
};

export const getCancelTx = (
  network: Network,
  address: string,
  campaignId: number
): ContractCallOptions => {
  return {
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    contractAddress: FUNDRAISING_CONTRACT.address || "",
    contractName: FUNDRAISING_CONTRACT.name,
    network,
    functionName: "cancel-campaign",
    functionArgs: [uintCV(campaignId)],
    postConditions: [Pc.principal(address).willSendEq(0).ustx()],
  };
};

export const getRefundTx = (
  network: Network,
  address: string,
  campaignId: number
): ContractCallOptions => {
  return {
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    contractAddress: FUNDRAISING_CONTRACT.address || "",
    contractName: FUNDRAISING_CONTRACT.name,
    network,
    functionName: "refund",
    functionArgs: [uintCV(campaignId)],
    postConditions: [Pc.principal(address).willSendEq(0).ustx()],
  };
};

export const getWithdrawTx = (
  network: Network,
  address: string,
  campaignId: number,
  totals?: {
    totalStxUstx?: bigint | number;
    totalSbtcSats?: bigint | number;
  }
): ContractCallOptions => {
  const fundraisingContractId =
    `${FUNDRAISING_CONTRACT.address}.${FUNDRAISING_CONTRACT.name}` as `${string}.${string}`;
  const sbtcContractId =
    `${SBTC_CONTRACT.address}.${SBTC_CONTRACT.name}` as `${string}.${string}`;

  const totalStxUstx = totals?.totalStxUstx ?? 0;
  const totalSbtcSats = totals?.totalSbtcSats ?? 0;

  const postConditions: PostCondition[] = [
    // Caller should not send any STX out as part of withdrawing.
    Pc.principal(address).willSendEq(0).ustx(),
  ];

  if (
    typeof FUNDRAISING_CONTRACT.address === "string" &&
    FUNDRAISING_CONTRACT.address
  ) {
    if (BigInt(totalStxUstx) > BigInt(0)) {
      postConditions.push(
        Pc.principal(fundraisingContractId).willSendEq(totalStxUstx).ustx()
      );
    }
    if (BigInt(totalSbtcSats) > BigInt(0)) {
      postConditions.push(
        Pc.principal(fundraisingContractId)
          .willSendEq(totalSbtcSats)
          .ft(sbtcContractId, "sbtc-token")
      );
    }
  }

  return {
    anchorMode: AnchorMode.Any,
    postConditionMode: PostConditionMode.Deny,
    contractAddress: FUNDRAISING_CONTRACT.address || "",
    contractName: FUNDRAISING_CONTRACT.name,
    network,
    functionName: "withdraw",
    functionArgs: [uintCV(campaignId)],
    postConditions,
  };
};
