"use client";

import { CampaignGrid } from "@/components/home";

/**
 * Dedicated campaigns discovery page.
 */
export default function CampaignsPage() {
  return (
    <CampaignGrid
      title="Explore Campaigns"
      subtitle="Back community projects raising STX and sBTC on Stacks."
      showSort
      showFilters
      showHeader
    />
  );
}
