"use client";
import { HeroSection, QuickStatsBar, CampaignGrid, HowItWorksSection } from "@/components/home";
import { useSyncPendingMetadata } from "@/hooks/useSyncPendingMetadata";

/**
 * Homepage component with campaign discovery.
 */
export default function HomePage() {
  // Sync pending campaign metadata from localStorage to indexer
  useSyncPendingMetadata();

  return (
    <>
      {/* Hero Section */}
      <HeroSection />
      {/* Platform Stats */}
      <QuickStatsBar />

      {/* How It Works */}
      <HowItWorksSection />

      {/* Campaign Grid */}
      <CampaignGrid
        title="Explore Campaigns"
        showSort={false}
        limit={3}
        actionLabel="View all campaigns"
        actionHref="/campaigns"
      />
    </>
  );
}
