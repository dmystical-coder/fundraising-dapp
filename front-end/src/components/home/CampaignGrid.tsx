"use client";

import {
  Box,
  Container,
  Heading,
  HStack,
  Select,
  SimpleGrid,
  Text,
  Skeleton,
  VStack,
  Button,
} from "@chakra-ui/react";
import { useState, useMemo } from "react";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { useIndexerCampaigns, IndexedCampaign } from "@/hooks/indexerQueries";
import { useCurrentPrices } from "@/lib/currency-utils";

type SortOption = "newest" | "most-funded" | "ending-soon" | "most-donors";

interface CampaignWithOnChain extends IndexedCampaign {
  endAt?: number;
  goal?: number;
  isExpired: boolean;
}

interface CampaignGridProps {
  campaigns?: CampaignWithOnChain[];
  isLoading?: boolean;
  showSort?: boolean;
  title?: string;
  limit?: number;
}

/**
 * Sort campaigns based on selected option.
 */
function sortCampaigns(
  campaigns: CampaignWithOnChain[],
  sortBy: SortOption
): CampaignWithOnChain[] {
  const sorted = [...campaigns];

  switch (sortBy) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case "most-funded":
      // Sort by total STX + proportional sBTC value
      return sorted.sort((a, b) => {
        const aTotal = parseInt(a.total_stx, 10) + parseInt(a.total_sbtc, 10) * 10000;
        const bTotal = parseInt(b.total_stx, 10) + parseInt(b.total_sbtc, 10) * 10000;
        return bTotal - aTotal;
      });
    case "ending-soon":
      const now = Math.floor(Date.now() / 1000);
      return sorted
        .filter((c) => c.endAt && c.endAt > now && !c.is_cancelled)
        .sort((a, b) => (a.endAt || 0) - (b.endAt || 0));
    case "most-donors":
      return sorted.sort((a, b) => b.donation_count - a.donation_count);
    default:
      return sorted;
  }
}

/**
 * Campaign grid component with sorting options.
 */
export function CampaignGrid({
  campaigns: propCampaigns,
  isLoading: propIsLoading,
  showSort = true,
  title = "Active Campaigns",
  limit,
}: CampaignGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  // Use prop campaigns or fetch from indexer
  const { data: indexerCampaigns, isLoading: indexerLoading } =
    useIndexerCampaigns();
  const { data: prices } = useCurrentPrices();

  const isLoading = propIsLoading !== undefined ? propIsLoading : indexerLoading;

  // Transform and sort campaigns
  const displayCampaigns = useMemo(() => {
    const baseCampaigns = propCampaigns || indexerCampaigns || [];
    // Add isExpired flag based on current time and endAt
    const now = Math.floor(Date.now() / 1000);
    const enriched: CampaignWithOnChain[] = baseCampaigns.map((c) => ({
      ...c,
      endAt: (c as CampaignWithOnChain).endAt,
      goal: (c as CampaignWithOnChain).goal,
      isExpired: (c as CampaignWithOnChain).endAt 
        ? ((c as CampaignWithOnChain).endAt as number) <= now 
        : false,
    }));

    const sorted = sortCampaigns(enriched, sortBy);
    return limit ? sorted.slice(0, limit) : sorted;
  }, [propCampaigns, indexerCampaigns, sortBy, limit]);

  if (isLoading) {
    return (
      <Box id="campaigns" py={8}>
        <Container maxW="container.xl">
          <HStack justify="space-between" mb={6}>
            <Skeleton height="32px" width="200px" />
            {showSort && <Skeleton height="40px" width="180px" />}
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height="280px" borderRadius="xl" />
            ))}
          </SimpleGrid>
        </Container>
      </Box>
    );
  }

  if (!displayCampaigns || displayCampaigns.length === 0) {
    return (
      <Box id="campaigns" py={8}>
        <Container maxW="container.xl">
          <VStack spacing={6} py={12} textAlign="center">
            <Text fontSize="6xl">🎯</Text>
            <Heading size="lg" color="gray.700">
              No Campaigns Yet
            </Heading>
            <Text color="gray.500" maxW="400px">
              Be the first to create a fundraising campaign and start accepting
              donations in STX and sBTC.
            </Text>
            <Button
              as="a"
              href="/campaigns/new"
              colorScheme="primary"
              size="lg"
            >
              Create First Campaign
            </Button>
          </VStack>
        </Container>
      </Box>
    );
  }

  return (
    <Box id="campaigns" py={8}>
      <Container maxW="container.xl">
        {/* Header */}
        <HStack justify="space-between" mb={6} flexWrap="wrap" gap={4}>
          <Heading size="lg" color="gray.800">
            {title}
          </Heading>
          {showSort && (
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              maxW="200px"
              bg="warm.surface"
              borderColor="warm.border"
              _hover={{ borderColor: "primary.300" }}
            >
              <option value="newest">Newest First</option>
              <option value="most-funded">Most Funded</option>
              <option value="ending-soon">Ending Soon</option>
              <option value="most-donors">Most Donors</option>
            </Select>
          )}
        </HStack>

        {/* Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {displayCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.campaign_id}
              campaignId={campaign.campaign_id}
              beneficiary={campaign.beneficiary}
              totalStx={campaign.total_stx}
              totalSbtc={campaign.total_sbtc}
              goal={campaign.goal}
              endAt={campaign.endAt}
              donationCount={campaign.donation_count}
              isCancelled={campaign.is_cancelled}
              isWithdrawn={campaign.is_withdrawn}
              isExpired={campaign.isExpired}
              stxPrice={prices?.stx}
              sbtcPrice={prices?.sbtc}
            />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default CampaignGrid;
