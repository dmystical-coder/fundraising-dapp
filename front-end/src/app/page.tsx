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

      {/* Campaign Grid */}
      <CampaignGrid title="Explore Campaigns" showSort />

      {/* Platform Stats */}
      <QuickStatsBar />

      {/* How It Works */}
      <HowItWorksSection />
    </>
  );
}
