import { useQuery, UseQueryResult } from "@tanstack/react-query";
import {
  BadgeMetadata,
  BadgeTier,
  computeStxEquivalent,
  getBadgeMetadata,
  getDonorBadgeId,
  getDonorContributionStxEquivalent,
  TIER_NONE,
  tierForAmount,
} from "@/lib/donor-badges-reads";
import {
  getSbtcDonation,
  getStxDonation,
} from "@/lib/fundraising-reads";

// React Query keys live inline with the hooks that own them; queryClient
// cache invalidation in DonationModal targets these prefixes.
const donorBadgeIdKey = (campaignId: number | null, donor: string | null) =>
  ["donorBadge", "id", campaignId, donor] as const;

const badgeMetadataKey = (tokenId: bigint | null) =>
  ["donorBadge", "metadata", tokenId?.toString() ?? null] as const;

const previewTierKey = (campaignId: number | null, donor: string | null) =>
  ["donorBadge", "previewTier", campaignId, donor] as const;

export type BadgeClaimState =
  | { status: "not-eligible"; donatedStxEquivalent: bigint }
  | { status: "claimable"; previewTier: BadgeTier; donatedStxEquivalent: bigint }
  | {
      status: "claimed";
      tokenId: bigint;
      metadata: BadgeMetadata;
      previewTier: BadgeTier;
      donatedStxEquivalent: bigint;
    }
  | {
      status: "upgradeable";
      tokenId: bigint;
      metadata: BadgeMetadata;
      previewTier: BadgeTier;
      donatedStxEquivalent: bigint;
    };

// Single composite query that drives the badge panel: resolves the donor's
// current contribution, the tier they'd qualify for, and whether they've
// already minted a badge for the campaign. Returns null when inputs are
// incomplete so the UI can render a wallet-not-connected state.
export const useBadgeClaimState = (
  campaignId: number | null | undefined,
  donor: string | null | undefined
): UseQueryResult<BadgeClaimState | null> => {
  const cid = campaignId ?? null;
  const d = donor ?? null;

  return useQuery<BadgeClaimState | null>({
    queryKey: ["donorBadge", "claimState", cid, d],
    queryFn: async () => {
      if (!cid || !d) return null;

      // Compute STX-equivalent. Prefer the chain-side public function so
      // we honor the contract's current sBTC rate; fall back to a JS-side
      // computation if the call-read endpoint rejects the public-fn read.
      let stxEquivalent = await getDonorContributionStxEquivalent(cid, d);
      if (stxEquivalent === null) {
        const [stx, sbtc] = await Promise.all([
          getStxDonation(cid, d),
          getSbtcDonation(cid, d),
        ]);
        stxEquivalent = computeStxEquivalent(stx, sbtc);
      }

      const previewTier = tierForAmount(stxEquivalent);
      const tokenId = await getDonorBadgeId(cid, d);

      if (tokenId === null) {
        if (previewTier === TIER_NONE) {
          return {
            status: "not-eligible",
            donatedStxEquivalent: stxEquivalent,
          };
        }
        return {
          status: "claimable",
          previewTier,
          donatedStxEquivalent: stxEquivalent,
        };
      }

      const metadata = await getBadgeMetadata(tokenId);
      if (!metadata) {
        // Shouldn't happen -- the donor-badge-id map and badge-metadata
        // map are written atomically in claim-badge. Treat as claimable
        // so the user can recover by re-claiming.
        return {
          status: "claimable",
          previewTier,
          donatedStxEquivalent: stxEquivalent,
        };
      }

      const isUpgradeable = previewTier > metadata.tier;
      return {
        status: isUpgradeable ? "upgradeable" : "claimed",
        tokenId,
        metadata,
        previewTier,
        donatedStxEquivalent: stxEquivalent,
      };
    },
    enabled: !!cid && !!d,
    refetchInterval: 15000,
    retry: false,
  });
};

// Lower-level hooks: callers that only need one slice of the state above
// can reach for these directly without paying for the composite query.

export const useDonorBadgeId = (
  campaignId: number | null | undefined,
  donor: string | null | undefined
): UseQueryResult<bigint | null> => {
  return useQuery<bigint | null>({
    queryKey: donorBadgeIdKey(campaignId ?? null, donor ?? null),
    queryFn: async () => {
      if (!campaignId || !donor) return null;
      return getDonorBadgeId(campaignId, donor);
    },
    enabled: !!campaignId && !!donor,
    refetchInterval: 15000,
    retry: false,
  });
};

export const useBadgeMetadata = (
  tokenId: bigint | null | undefined
): UseQueryResult<BadgeMetadata | null> => {
  return useQuery<BadgeMetadata | null>({
    queryKey: badgeMetadataKey(tokenId ?? null),
    queryFn: async () => {
      if (tokenId === null || tokenId === undefined) return null;
      return getBadgeMetadata(tokenId);
    },
    enabled: tokenId !== null && tokenId !== undefined,
    retry: false,
  });
};

export const usePreviewBadgeTier = (
  campaignId: number | null | undefined,
  donor: string | null | undefined
): UseQueryResult<BadgeTier | null> => {
  return useQuery<BadgeTier | null>({
    queryKey: previewTierKey(campaignId ?? null, donor ?? null),
    queryFn: async () => {
      if (!campaignId || !donor) return null;
      let stxEquivalent = await getDonorContributionStxEquivalent(
        campaignId,
        donor
      );
      if (stxEquivalent === null) {
        const [stx, sbtc] = await Promise.all([
          getStxDonation(campaignId, donor),
          getSbtcDonation(campaignId, donor),
        ]);
        stxEquivalent = computeStxEquivalent(stx, sbtc);
      }
      return tierForAmount(stxEquivalent);
    },
    enabled: !!campaignId && !!donor,
    refetchInterval: 15000,
    retry: false,
  });
};

// Prefix for queryClient.invalidateQueries({ queryKey: BADGE_QUERY_PREFIX })
// after a successful donate or claim-badge tx.
export const BADGE_QUERY_PREFIX = ["donorBadge"] as const;
