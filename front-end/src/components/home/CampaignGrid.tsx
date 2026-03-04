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
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { useIndexerCampaigns, IndexedCampaign } from "@/hooks/indexerQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { useAddress } from "@/components/ConnectWallet";

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

export function CampaignGrid({
  campaigns: propCampaigns,
  isLoading: propIsLoading,
  showSort = true,
  title = "Active Campaigns",
  limit,
}: CampaignGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [pendingCampaign, setPendingCampaign] = useState<CampaignWithOnChain | null>(null);
  const address = useAddress();

  const { data: indexerCampaigns, isLoading: indexerLoading, error: fetchError, refetch } =
    useIndexerCampaigns();
  const { data: prices } = useCurrentPrices();

  // Listen for localStorage changes via storage event instead of polling
  const checkPending = useCallback(() => {
    if (!address) return;
    const key = `pending_campaign_metadata_${address}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const meta = JSON.parse(saved);
        if (Date.now() - meta.createdAt < 86400000) {
          setPendingCampaign({
            campaign_id: -1,
            owner: meta.owner,
            beneficiary: meta.owner,
            title: meta.title,
            description: meta.description,
            total_stx: "0",
            total_sbtc: "0",
            donation_count: 0,
            is_cancelled: false,
            is_withdrawn: false,
            created_at: new Date(meta.createdAt).toISOString(),
            isExpired: false,
            // @ts-expect-error - CampaignWithOnChain type mismatch expected
            isPending: true
          });
        }
      } catch (e) {
        console.error("Failed to parse pending metadata", e);
      }
    } else {
      setPendingCampaign(null);
    }
  }, [address]);

  useEffect(() => {
    checkPending();
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("pending_campaign_metadata_")) {
        checkPending();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [checkPending]);

  const isLoading = propIsLoading !== undefined ? propIsLoading : indexerLoading;

  // Separate pending campaign check from the memo to avoid state-setter-in-memo
  useEffect(() => {
    if (!pendingCampaign) return;
    const baseCampaigns = propCampaigns || indexerCampaigns || [];
    const exists = baseCampaigns.some(c =>
      c.owner === pendingCampaign.owner &&
      c.title === pendingCampaign.title
    );
    if (exists) {
      setPendingCampaign(null);
    }
  }, [propCampaigns, indexerCampaigns, pendingCampaign]);

  const displayCampaigns = useMemo(() => {
    let baseCampaigns = propCampaigns || indexerCampaigns || [];

    if (pendingCampaign) {
      const exists = baseCampaigns.some(c =>
        c.owner === pendingCampaign.owner &&
        c.title === pendingCampaign.title
      );
      if (!exists) {
        baseCampaigns = [pendingCampaign, ...baseCampaigns];
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const enriched: CampaignWithOnChain[] = baseCampaigns.map((c) => ({
      ...c,
      endAt: (c as CampaignWithOnChain).endAt || 0,
      goal: (c as CampaignWithOnChain).goal || 0,
      isExpired: (c as CampaignWithOnChain).endAt 
        ? ((c as CampaignWithOnChain).endAt as number) <= now 
        : false,
    }));

    const sorted = sortCampaigns(enriched, sortBy);
    return limit ? sorted.slice(0, limit) : sorted;
  }, [propCampaigns, indexerCampaigns, sortBy, limit, pendingCampaign]);

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

  if (fetchError) {
    return (
      <Box id="campaigns" py={8}>
        <Container maxW="container.xl">
          <Alert
            status="warning"
            borderRadius="xl"
            p={6}
            flexDirection={{ base: "column", sm: "row" }}
            alignItems="center"
            gap={4}
          >
            <AlertIcon boxSize={6} />
            <Box flex="1">
              <Text fontWeight="600" color="chakra-body-text">
                Could not load campaigns
              </Text>
              <Text fontSize="sm" color="gray.500">
                Check your connection or try again.
              </Text>
            </Box>
            <Button
              size="sm"
              variant="outline"
              colorScheme="primary"
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </Alert>
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
            <Heading size="lg">
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
        <HStack justify="space-between" mb={6} flexWrap="wrap" gap={4}>
          <Heading size="lg">
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
              title={campaign.title || undefined}
              // @ts-expect-error - Handle custom isPending flag
              isPending={campaign.isPending}
            />
          ))}
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default CampaignGrid;
