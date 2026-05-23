// Indexer API configuration
const getIndexerUrl = () => {
  const configured = process.env.NEXT_PUBLIC_INDEXER_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  // In the browser, prefer same-origin API calls so domain changes do not
  // require redeploying env vars.
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // SSR/server fallback for hosted environments.
  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "")}`;
  }

  // Final fallback (works in local dev with same-origin requests).
  return "";
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
    ownerSupporters: (principal: string) =>
      `/api/owner/${encodeURIComponent(principal)}/supporters`,
  },
} as const;
