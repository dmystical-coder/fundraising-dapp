import { UseQueryResult, useQuery } from "@tanstack/react-query";
import { getApi, getStacksUrl } from "@/lib/stacks-api";
import { FUNDRAISING_CONTRACT } from "@/constants/contracts";
import {
  cvToJSON,
  hexToCV,
  cvToHex,
  principalCV,
  uintCV,
} from "@stacks/transactions";
import { PriceData, satsToSbtc, ustxToStx } from "@/lib/currency-utils";

export interface CampaignInfo {
  id: number;
  owner: string;
  beneficiary: string;
  startBlock: number;
  start: number;
  end: number;
  createdAt: number;
  endAt: number;
  goal: number;
  totalStx: number;
  totalSbtc: number;
  usdValue: number;
  donationCount: number;
  isExpired: boolean;
  isWithdrawn: boolean;
  isCancelled: boolean;
}

/**
 * Fetch campaign info from blockchain by ID.
 */
async function fetchCampaignFromChain(
  campaignId: number,
  currentPrices: PriceData | undefined
): Promise<CampaignInfo> {
  const api = getApi(getStacksUrl()).smartContractsApi;

  const response = await api.callReadOnlyFunction({
    contractAddress: FUNDRAISING_CONTRACT.address || "",
    contractName: FUNDRAISING_CONTRACT.name,
    functionName: "get-campaign-info",
    readOnlyFunctionArgs: {
      sender: FUNDRAISING_CONTRACT.address || "",
      arguments: [cvToHex(uintCV(campaignId))],
    },
  });

  if (response?.okay && response?.result) {
    const result = cvToJSON(hexToCV(response?.result || ""));
    if (result?.success) {
      const totalSbtc = parseInt(result?.value?.value?.totalSbtc?.value, 10);
      const totalStx = parseInt(result?.value?.value?.totalStx?.value, 10);

      const owner = result?.value?.value?.owner?.value;
      const beneficiary = result?.value?.value?.beneficiary?.value;

      return {
        id: parseInt(result?.value?.value?.id?.value, 10),
        owner,
        beneficiary,
        startBlock: parseInt(result?.value?.value?.startBlock?.value, 10),
        start: parseInt(result?.value?.value?.start?.value, 10),
        end: parseInt(result?.value?.value?.end?.value, 10),
        createdAt: parseInt(result?.value?.value?.createdAt?.value, 10),
        endAt: parseInt(result?.value?.value?.endAt?.value, 10),
        goal: parseInt(result?.value?.value?.goal?.value, 10),
        totalSbtc,
        totalStx,
        usdValue:
          Number(ustxToStx(totalStx)) * (currentPrices?.stx || 0) +
          satsToSbtc(totalSbtc) * (currentPrices?.sbtc || 0),
        donationCount: parseInt(
          result?.value?.value?.donationCount?.value,
          10
        ),
        isExpired: result?.value?.value?.isExpired?.value,
        isWithdrawn: result?.value?.value?.isWithdrawn?.value,
        isCancelled: result?.value?.value?.isCancelled?.value,
      };
    } else {
      throw new Error("Error decoding campaign info from blockchain");
    }
  } else {
    throw new Error(
      response?.cause || "Error fetching campaign info from blockchain"
    );
  }
}

/**
 * Fetch a specific campaign by ID.
 */
export const useCampaignById = (
  campaignId: number | null | undefined,
  currentPrices: PriceData | undefined
): UseQueryResult<CampaignInfo | null> => {
  return useQuery<CampaignInfo | null>({
    queryKey: ["campaignInfo", campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      return fetchCampaignFromChain(campaignId, currentPrices);
    },
    refetchInterval: 10000,
    retry: false,
    enabled: !!campaignId,
  });
};

/**
 * Fetch the last campaign ID.
 */
export const useLastCampaignId = (): UseQueryResult<number | null> => {
  const api = getApi(getStacksUrl()).smartContractsApi;

  return useQuery<number | null>({
    queryKey: ["lastCampaignId"],
    queryFn: async () => {
      const response = await api.callReadOnlyFunction({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "get-last-campaign-id",
        readOnlyFunctionArgs: {
          sender: FUNDRAISING_CONTRACT.address || "",
          arguments: [],
        },
      });

      if (!response?.okay || !response?.result) {
        throw new Error(
          response?.cause || "Error fetching last campaign id"
        );
      }

      const cv = cvToJSON(hexToCV(response.result));
      if (!cv?.success) {
        throw new Error("Error decoding last campaign id");
      }

      return parseInt(cv?.value?.value, 10) || null;
    },
    refetchInterval: 30000,
    retry: false,
  });
};

export interface CampaignDonation {
  stxAmount: number;
  sbtcAmount: number;
}

export const useExistingDonation = (
  address: string | null | undefined,
  campaignId: number | null | undefined
): UseQueryResult<CampaignDonation> => {
  const api = getApi(getStacksUrl()).smartContractsApi;
  return useQuery<CampaignDonation>({
    queryKey: ["campaignDonations", campaignId, address],
    queryFn: async () => {
      if (!address) throw new Error("Address is required");
      if (!campaignId) throw new Error("Campaign id is required");

      const stxResponse = await api.callReadOnlyFunction({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "get-stx-donation",
        readOnlyFunctionArgs: {
          sender: FUNDRAISING_CONTRACT.address || "",
          arguments: [
            cvToHex(uintCV(campaignId)),
            cvToHex(principalCV(address)),
          ],
        },
      });

      const sbtcResponse = await api.callReadOnlyFunction({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "get-sbtc-donation",
        readOnlyFunctionArgs: {
          sender: FUNDRAISING_CONTRACT.address || "",
          arguments: [
            cvToHex(uintCV(campaignId)),
            cvToHex(principalCV(address)),
          ],
        },
      });

      if (stxResponse?.okay && sbtcResponse?.okay) {
        const stxResult = cvToJSON(hexToCV(stxResponse?.result || ""));
        const sbtcResult = cvToJSON(hexToCV(sbtcResponse?.result || ""));

        if (stxResult?.success && sbtcResult?.success) {
          return {
            stxAmount: parseInt(stxResult?.value?.value, 10),
            sbtcAmount: parseInt(sbtcResult?.value?.value, 10),
          };
        } else {
          throw new Error("Error fetching donation info from blockchain");
        }
      } else {
        throw new Error(
          stxResponse?.cause || sbtcResponse?.cause
            ? `${stxResponse?.cause}. ${sbtcResponse?.cause}`
            : "Error fetching donation info from blockchain"
        );
      }
    },
    enabled: !!address && !!campaignId,
    refetchInterval: 10000,
    retry: false,
  });
};

