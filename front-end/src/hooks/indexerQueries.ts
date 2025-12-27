import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { INDEXER_CONFIG } from "@/constants/indexer";

// ============================================================================
// Types
// ============================================================================

export interface IndexedCampaign {
  campaign_id: number;
  owner: string | null;
  beneficiary: string | null;
  donation_count: number;
  total_stx: string;
  total_sbtc: string;
  is_cancelled: boolean;
  is_withdrawn: boolean;
  created_at: string;
  title: string | null;
  description: string | null;
}

export interface CampaignEvent {
  event_name: string;
  donor: string | null;
  owner: string | null;
  beneficiary: string | null;
  amount: string | null;
  token: string | null;
  txid: string | null;
  block_height: string | null;
  inserted_at: string;
}

export interface LeaderboardEntry {
  donor: string;
  total_stx: string;
  total_sbtc: string;
  donation_count: number;
}

export interface ActivityEvent {
  event_name: string;
  campaign_id: number | null;
  donor: string | null;
  owner: string | null;
  beneficiary: string | null;
  amount: string | null;
  txid: string | null;
  block_height: string | null;
  inserted_at: string;
}

export interface DonorDonation {
  campaign_id: number;
  event_name: string;
  amount: string;
  txid: string | null;
  block_height: string | null;
  inserted_at: string;
}

export interface PlatformStats {
  total_campaigns: number;
  campaigns_funded: number;
  total_stx_raised: string;
  total_sbtc_raised: string;
  unique_donors: number;
  total_donations: number;
}

// ============================================================================
// API Fetch Helpers
// ============================================================================

async function fetchFromIndexer<T>(endpoint: string): Promise<T> {
  const url = `${INDEXER_CONFIG.url}${endpoint}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Indexer API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// API Mutation Helpers
// ============================================================================

/**
 * Save campaign metadata (title, description) to the indexer.
 * This should be called after a campaign is created on-chain.
 */
export async function saveCampaignMetadata(params: {
  campaignId: number;
  owner: string;
  title: string;
  description: string;
}): Promise<{ ok: boolean; campaignId: number }> {
  const url = `${INDEXER_CONFIG.url}${INDEXER_CONFIG.endpoints.campaignMetadata(params.campaignId)}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      owner: params.owner,
      title: params.title,
      description: params.description,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to save campaign metadata: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch all campaigns from the indexer with aggregated stats.
 */
export function useIndexerCampaigns(): UseQueryResult<IndexedCampaign[]> {
  return useQuery({
    queryKey: ["indexer", "campaigns"],
    queryFn: async () => {
      const data = await fetchFromIndexer<{ campaigns: IndexedCampaign[] }>(
        INDEXER_CONFIG.endpoints.campaigns
      );
      return data.campaigns;
    },
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // 1 minute
  });
}

/**
 * Fetch a single campaign's indexed data.
 */
export function useIndexerCampaign(
  campaignId: number | null | undefined
): UseQueryResult<IndexedCampaign | null> {
  return useQuery({
    queryKey: ["indexer", "campaign", campaignId],
    queryFn: async () => {
      if (!campaignId) return null;
      const data = await fetchFromIndexer<{ campaign: IndexedCampaign }>(
        INDEXER_CONFIG.endpoints.campaign(campaignId)
      );
      return data.campaign;
    },
    enabled: !!campaignId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

/**
 * Fetch activity/event history for a specific campaign.
 */
export function useCampaignActivity(
  campaignId: number | null | undefined,
  limit: number = 50
): UseQueryResult<CampaignEvent[]> {
  return useQuery({
    queryKey: ["indexer", "campaign", campaignId, "events", limit],
    queryFn: async () => {
      if (!campaignId) return [];
      const data = await fetchFromIndexer<{ events: CampaignEvent[] }>(
        `${INDEXER_CONFIG.endpoints.campaignEvents(campaignId)}?limit=${limit}`
      );
      return data.events;
    },
    enabled: !!campaignId,
    staleTime: 10_000,
    refetchInterval: 15_000, // More frequent for activity feed
  });
}

/**
 * Fetch donor leaderboard for a specific campaign.
 */
export function useCampaignLeaderboard(
  campaignId: number | null | undefined,
  limit: number = 20
): UseQueryResult<LeaderboardEntry[]> {
  return useQuery({
    queryKey: ["indexer", "campaign", campaignId, "leaderboard", limit],
    queryFn: async () => {
      if (!campaignId) return [];
      const data = await fetchFromIndexer<{ leaderboard: LeaderboardEntry[] }>(
        `${INDEXER_CONFIG.endpoints.campaignLeaderboard(campaignId)}?limit=${limit}`
      );
      return data.leaderboard;
    },
    enabled: !!campaignId,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch platform-wide activity feed.
 */
export function usePlatformActivity(
  limit: number = 20
): UseQueryResult<ActivityEvent[]> {
  return useQuery({
    queryKey: ["indexer", "activity", limit],
    queryFn: async () => {
      const data = await fetchFromIndexer<{ activity: ActivityEvent[] }>(
        `${INDEXER_CONFIG.endpoints.activity}?limit=${limit}`
      );
      return data.activity;
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });
}

/**
 * Fetch donation history for a specific donor.
 */
export function useMyDonations(
  address: string | null | undefined,
  limit: number = 50
): UseQueryResult<DonorDonation[]> {
  return useQuery({
    queryKey: ["indexer", "donor", address, "donations", limit],
    queryFn: async () => {
      if (!address) return [];
      const data = await fetchFromIndexer<{ donations: DonorDonation[] }>(
        `${INDEXER_CONFIG.endpoints.donorDonations(address)}?limit=${limit}`
      );
      return data.donations;
    },
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

/**
 * Fetch platform-wide statistics.
 */
export function usePlatformStats(): UseQueryResult<PlatformStats> {
  return useQuery({
    queryKey: ["indexer", "stats"],
    queryFn: async () => {
      const data = await fetchFromIndexer<{ stats: PlatformStats }>(
        INDEXER_CONFIG.endpoints.stats
      );
      return data.stats;
    },
    staleTime: 60_000, // 1 minute
    refetchInterval: 120_000, // 2 minutes
  });
}

/**
 * Fetch campaigns created by a specific owner.
 */
export function useMyCampaigns(
  address: string | null | undefined
): UseQueryResult<IndexedCampaign[]> {
  return useQuery({
    queryKey: ["indexer", "owner", address, "campaigns"],
    queryFn: async () => {
      if (!address) return [];
      const data = await fetchFromIndexer<{ campaigns: IndexedCampaign[] }>(
        INDEXER_CONFIG.endpoints.ownerCampaigns(address)
      );
      return data.campaigns;
    },
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
