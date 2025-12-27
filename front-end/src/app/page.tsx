"use client";

import { Container } from "@chakra-ui/react";
import { HeroSection, QuickStatsBar, CampaignGrid } from "@/components/home";
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
      <Container maxW="container.xl" px={{ base: 4, md: 8 }}>
        <HeroSection />
      </Container>

      {/* Platform Stats */}
      <QuickStatsBar />

      {/* Campaign Grid */}
      <CampaignGrid title="Explore Campaigns" showSort />
    </>
  );
}
