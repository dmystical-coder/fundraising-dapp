import { getApi, getStacksUrl } from "@/lib/stacks-api";
import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { FUNDRAISING_CONTRACT } from "@/constants/contracts";
import { cvToJSON, hexToCV } from "@stacks/transactions";

export const useCurrentBtcBlock = (): UseQueryResult<number> => {
  const api = getApi(getStacksUrl()).blocksApi;
  return useQuery<number>({
    queryKey: ["currentBlock"],
    queryFn: async () => {
      const response = await api.getBlocks({ limit: 1 });

      const latestBlockHeight = response?.results?.[0]?.burn_block_height;
      if (latestBlockHeight) {
        return latestBlockHeight;
      } else {
        throw new Error("Error fetching current block height from on-chain");
      }
    },
    refetchInterval: 10000,
  });
};

export const useCurrentStacksBlockTime = (): UseQueryResult<number> => {
  const api = getApi(getStacksUrl()).smartContractsApi;
  return useQuery<number>({
    queryKey: ["currentStacksBlockTime"],
    queryFn: async () => {
      const response = await api.callReadOnlyFunction({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "get-current-stacks-block-time",
        readOnlyFunctionArgs: {
          sender: FUNDRAISING_CONTRACT.address || "",
          arguments: [],
        },
      });

      if (!response?.okay || !response?.result) {
        throw new Error(
          response?.cause || "Error fetching stacks-block-time from blockchain"
        );
      }

      const cv = cvToJSON(hexToCV(response.result));
      if (!cv?.success) {
        throw new Error("Error decoding stacks-block-time from blockchain");
      }

      return parseInt(cv?.value?.value, 10);
    },
    refetchInterval: 10000,
    retry: false,
  });
};

export const useSbtcTokenContract = (): UseQueryResult<string> => {
  const api = getApi(getStacksUrl()).smartContractsApi;
  return useQuery<string>({
    queryKey: ["sbtcTokenContract"],
    queryFn: async () => {
      const response = await api.callReadOnlyFunction({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "get-sbtc-token-contract",
        readOnlyFunctionArgs: {
          sender: FUNDRAISING_CONTRACT.address || "",
          arguments: [],
        },
      });

      if (!response?.okay || !response?.result) {
        throw new Error(
          response?.cause ||
            "Error fetching sBTC token contract from fundraising contract"
        );
      }

      const cv = cvToJSON(hexToCV(response.result));
      if (!cv?.success) {
        throw new Error("Error decoding sBTC token contract from blockchain");
      }

      // Expected decoded shape:
      // { type: 'response', success: true, value: { type: 'principal', value: 'SM...' } }
      // Be defensive in case the API changes.
      const principal =
        cv?.value?.type === "principal"
          ? cv?.value?.value
          : cv?.value?.value?.value;

      if (typeof principal !== "string" || !principal.length) {
        throw new Error("Invalid sBTC token contract principal received");
      }

      return principal;
    },
    refetchInterval: 60_000,
    retry: false,
  });
};
