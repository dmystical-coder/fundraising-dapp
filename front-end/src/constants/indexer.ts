// Indexer API configuration
const getIndexerUrl = () => {
  return process.env.NEXT_PUBLIC_INDEXER_URL || "http://localhost:4001";
};

export const INDEXER_CONFIG = {
  url: getIndexerUrl(),
  endpoints: {
    campaigns: "/api/campaigns",
    campaign: (id: number) => `/api/campaigns/${id}`,
    campaignMetadata: (id: number) => `/api/campaigns/${id}/metadata`,
    campaignEvents: (id: number) => `/api/campaigns/${id}/events`,
    campaignLeaderboard: (id: number) => `/api/campaigns/${id}/leaderboard`,
    activity: "/api/activity",
    donorDonations: (principal: string) =>
      `/api/donors/${encodeURIComponent(principal)}/donations`,
    stats: "/api/stats",
    ownerCampaigns: (principal: string) =>
      `/api/owner/${encodeURIComponent(principal)}/campaigns`,
  },
} as const;
