import { useQuery, useQueries, UseQueryResult } from "@tanstack/react-query";
import {
  getEscrowInfo,
  getTrancheInfo,
  hasVoted,
  EscrowInfo,
  TrancheInfo,
} from "@/lib/campaign-milestones-reads";

export const MILESTONES_QUERY_PREFIX = ["milestones"] as const;

export const useEscrowInfo = (
  campaignId: number | null | undefined
): UseQueryResult<EscrowInfo | null> => {
  return useQuery<EscrowInfo | null>({
    queryKey: [...MILESTONES_QUERY_PREFIX, "escrow", campaignId ?? null],
    queryFn: async () => {
      if (!campaignId) return null;
      return getEscrowInfo(campaignId);
    },
    enabled: !!campaignId,
    refetchInterval: 15000,
    retry: false,
  });
};

export interface TrancheSummary {
  id: number;
  info: TrancheInfo | null;
  hasVoted: boolean;
}

// Fetches all tranche infos and per-user has-voted in one composite query.
// Always runs exactly 4 sub-queries (max tranche count); sub-queries for
// indices beyond trancheCount are disabled via the `enabled` flag.
export const useTranches = (
  campaignId: number | null | undefined,
  trancheCount: number | null | undefined,
  donor: string | null | undefined
): TrancheSummary[] => {
  const results = useQueries({
    queries: Array.from({ length: 4 }, (_, i) => {
      const trancheId = i; // 0-indexed: valid IDs are 0..(trancheCount-1)
      return {
        queryKey: [
          ...MILESTONES_QUERY_PREFIX,
          "tranche",
          campaignId ?? null,
          trancheId,
          donor ?? null,
        ],
        queryFn: async (): Promise<TrancheSummary> => {
          const [info, voted] = await Promise.all([
            getTrancheInfo(campaignId!, trancheId),
            donor ? hasVoted(campaignId!, trancheId, donor) : false,
          ]);
          return { id: trancheId, info, hasVoted: voted };
        },
        enabled:
          !!campaignId &&
          trancheCount != null &&
          trancheId < trancheCount,
        refetchInterval: 15000,
        retry: false,
      };
    }),
  });

  return results
    .filter((r) => r.data !== undefined)
    .map((r) => r.data as TrancheSummary);
};
