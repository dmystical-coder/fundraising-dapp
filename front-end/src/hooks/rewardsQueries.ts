import { useQuery, UseQueryResult } from "@tanstack/react-query";
import {
  computeRewards,
  computeStxEquivalent,
  getClaimedRewardsAmount,
  getFstrBalance,
  hasClaimed,
  previewRewardsOnChain,
} from "@/lib/fundstacks-rewards-reads";
import {
  getCampaignInfo,
  getSbtcDonation,
  getStxDonation,
} from "@/lib/fundraising-reads";

const fstrBalanceKey = (who: string | null) =>
  ["rewards", "balance", who] as const;

const hasClaimedKey = (campaignId: number | null, donor: string | null) =>
  ["rewards", "hasClaimed", campaignId, donor] as const;

export type RewardsClaimState =
  | { status: "not-eligible"; contributionStxEq: bigint }
  | { status: "claimable"; previewTokens: bigint; contributionStxEq: bigint }
  | {
      status: "claimed";
      previewTokens: bigint;
      claimedTokens: bigint;
      contributionStxEq: bigint;
    };

// Composite hook driving the rewards panel. Resolves the donor's contribution,
// whether they've already claimed, and how many FSTR they'd earn (or earned).
// Returns null when inputs are incomplete (wallet not connected, no campaignId).
export const useRewardsClaimState = (
  campaignId: number | null | undefined,
  donor: string | null | undefined
): UseQueryResult<RewardsClaimState | null> => {
  const cid = campaignId ?? null;
  const d = donor ?? null;

  return useQuery<RewardsClaimState | null>({
    queryKey: ["rewards", "claimState", cid, d],
    queryFn: async () => {
      if (!cid || !d) return null;

      const [stx, sbtc, campaign, claimed] = await Promise.all([
        getStxDonation(cid, d),
        getSbtcDonation(cid, d),
        getCampaignInfo(cid),
        hasClaimed(cid, d),
      ]);

      const contributionStxEq = computeStxEquivalent(stx, sbtc);

      if (contributionStxEq === BigInt(0)) {
        return { status: "not-eligible", contributionStxEq };
      }

      const goal = campaign?.goal ?? BigInt(0);
      const totalStx = campaign?.totalStx ?? BigInt(0);

      // Prefer on-chain preview; fall back to JS mirror if the RPC rejects.
      const previewTokens =
        (await previewRewardsOnChain(contributionStxEq, goal, totalStx)) ??
        computeRewards(contributionStxEq, goal, totalStx);

      if (claimed) {
        const claimedTokens = (await getClaimedRewardsAmount(cid, d)) ?? previewTokens;
        return { status: "claimed", previewTokens, claimedTokens, contributionStxEq };
      }
      return { status: "claimable", previewTokens, contributionStxEq };
    },
    enabled: !!cid && !!d,
    refetchInterval: 15000,
    retry: false,
  });
};

export const useFstrBalance = (
  who: string | null | undefined
): UseQueryResult<bigint | null> => {
  return useQuery<bigint | null>({
    queryKey: fstrBalanceKey(who ?? null),
    queryFn: async () => {
      if (!who) return null;
      return getFstrBalance(who);
    },
    enabled: !!who,
    refetchInterval: 15000,
    retry: false,
  });
};

export const useHasClaimed = (
  campaignId: number | null | undefined,
  donor: string | null | undefined
): UseQueryResult<boolean | null> => {
  return useQuery<boolean | null>({
    queryKey: hasClaimedKey(campaignId ?? null, donor ?? null),
    queryFn: async () => {
      if (!campaignId || !donor) return null;
      return hasClaimed(campaignId, donor);
    },
    enabled: !!campaignId && !!donor,
    refetchInterval: 15000,
    retry: false,
  });
};

// Prefix for queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_PREFIX })
// after a successful earn-rewards tx.
export const REWARDS_QUERY_PREFIX = ["rewards"] as const;
