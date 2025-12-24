"use client";

import { Container } from "@chakra-ui/react";
import { HeroSection, QuickStatsBar, CampaignGrid } from "@/components/home";

/**
 * Homepage component with campaign discovery.
 */
export default function HomePage() {
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
