"use client";

import {
  Alert,
  AlertDescription,
  AlertIcon,
  AlertTitle,
  Box,
  Button,
  Container,
  Flex,
  Heading,
  HStack,
  Select,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import NextLink from "next/link";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { useIndexerCampaigns, IndexedCampaign } from "@/hooks/indexerQueries";
import { fetchCampaignFromChain, CampaignInfo } from "@/hooks/campaignQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { useAddress } from "@/components/ConnectWallet";

// ─── Constants ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 9;

// ─── Types ───────────────────────────────────────────────────────────────────

type SortOption = "newest" | "most-funded" | "ending-soon" | "most-donors";

interface CampaignWithOnChain extends IndexedCampaign {
  endAt?: number;
  goal?: number;
  isExpired: boolean;
  isPending?: boolean;
}

interface CampaignGridProps {
  campaigns?: CampaignWithOnChain[];
  isLoading?: boolean;
  showSort?: boolean;
  title?: string;
  limit?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortCampaigns(
  campaigns: CampaignWithOnChain[],
  sortBy: SortOption
): CampaignWithOnChain[] {
  const sorted = [...campaigns];
  switch (sortBy) {
    case "newest":
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    case "most-funded":
      return sorted.sort((a, b) => {
        const aTotal = parseInt(a.total_stx, 10) + parseInt(a.total_sbtc, 10) * 10_000;
        const bTotal = parseInt(b.total_stx, 10) + parseInt(b.total_sbtc, 10) * 10_000;
        return bTotal - aTotal;
      });
    case "ending-soon": {
      const now = Math.floor(Date.now() / 1000);
      return sorted
        .filter((c) => c.endAt && c.endAt > now && !c.is_cancelled)
        .sort((a, b) => (a.endAt ?? 0) - (b.endAt ?? 0));
    }
    case "most-donors":
      return sorted.sort((a, b) => b.donation_count - a.donation_count);
    default:
      return sorted;
  }
}

// ─── Skeleton card matching real CampaignCard footprint ──────────────────────

function CampaignCardSkeleton() {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="xl"
      overflow="hidden"
      p={5}
    >
      <VStack align="stretch" spacing={4}>
        {/* Title */}
        <Skeleton height="22px" width="80%" borderRadius="md" />
        <Skeleton height="16px" width="55%" borderRadius="md" mt="-2" />

        {/* Beneficiary */}
        <Skeleton height="16px" width="65%" borderRadius="md" />

        {/* Amount raised */}
        <Box>
          <Skeleton height="12px" width="40px" borderRadius="sm" mb={1.5} />
          <Skeleton height="26px" width="70%" borderRadius="md" />
        </Box>

        {/* Progress bar */}
        <Box>
          <HStack justify="space-between" mb={1}>
            <Skeleton height="11px" width="50px" borderRadius="sm" />
            <Skeleton height="11px" width="30px" borderRadius="sm" />
          </HStack>
          <Skeleton height="6px" borderRadius="full" />
        </Box>

        {/* Footer row */}
        <HStack justify="space-between" pt={2} borderTop="1px" borderColor="border.default">
          <Skeleton height="14px" width="60px" borderRadius="sm" />
          <Skeleton height="14px" width="80px" borderRadius="sm" />
        </HStack>
      </VStack>
    </Box>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CampaignGrid({
  campaigns: propCampaigns,
  isLoading: propIsLoading,
  showSort = true,
  title = "Explore Campaigns",
  limit,
}: CampaignGridProps) {
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [pendingCampaign, setPendingCampaign] = useState<CampaignWithOnChain | null>(null);
  const address = useAddress();

  const {
    data: indexerCampaigns,
    isLoading: indexerLoading,
    isError,
    error: fetchError,
    isFetching,
    refetch,
  } = useIndexerCampaigns();

  const { data: prices } = useCurrentPrices();

  const campaignIds = useMemo(
    () => (indexerCampaigns ?? []).map((c) => c.campaign_id),
    [indexerCampaigns]
  );

  const { data: onChainMap } = useQuery<Map<number, CampaignInfo>>({
    queryKey: ["onChainCampaignStatuses", campaignIds],
    queryFn: async () => {
      const results = await Promise.allSettled(
        campaignIds.map((id) => fetchCampaignFromChain(id, prices))
      );
      const map = new Map<number, CampaignInfo>();
      results.forEach((r, i) => {
        if (r.status === "fulfilled" && r.value) {
          map.set(campaignIds[i], r.value);
        }
      });
      return map;
    },
    enabled: campaignIds.length > 0,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // ── Pending campaign: event-driven storage (no polling) ──────────────────
  const checkPending = useCallback(() => {
    if (!address) {
      setPendingCampaign(null);
      return;
    }
    const key = `pending_campaign_metadata_${address}`;
    const saved = localStorage.getItem(key);
    if (!saved) {
      setPendingCampaign(null);
      return;
    }
    try {
      const meta = JSON.parse(saved);
      if (Date.now() - meta.createdAt >= 86_400_000) {
        localStorage.removeItem(key);
        setPendingCampaign(null);
        return;
      }
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
        isPending: true,
      });
    } catch {
      setPendingCampaign(null);
    }
  }, [address]);

  useEffect(() => {
    checkPending();
    const handleStorage = (e: StorageEvent) => {
      if (e.key?.startsWith("pending_campaign_metadata_")) checkPending();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [checkPending]);

  // ── Auto-dismiss pending campaign when indexer confirms it ───────────────
  useEffect(() => {
    if (!pendingCampaign || !indexerCampaigns) return;
    const confirmed = indexerCampaigns.some(
      (c) =>
        c.owner?.toLowerCase() === pendingCampaign.owner?.toLowerCase() &&
        c.title === pendingCampaign.title
    );
    if (confirmed) setPendingCampaign(null);
  }, [indexerCampaigns, pendingCampaign]);

  // ── Reset pagination when sort changes ───────────────────────────────────
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [sortBy]);

  // ── Build sorted campaign list ───────────────────────────────────────────
  const allCampaigns = useMemo(() => {
    const base = propCampaigns ?? indexerCampaigns ?? [];

    const withPending =
      pendingCampaign &&
      !base.some(
        (c) =>
          c.owner?.toLowerCase() === pendingCampaign.owner?.toLowerCase() &&
          c.title === pendingCampaign.title
      )
        ? [pendingCampaign, ...base]
        : base;

    const enriched = withPending.map((c) => {
      const onChain = onChainMap?.get(c.campaign_id);
      return {
        ...c,
        endAt: onChain?.endAt ?? (c as CampaignWithOnChain).endAt ?? 0,
        goal: onChain?.goal ?? (c as CampaignWithOnChain).goal ?? 0,
        is_cancelled: onChain?.isCancelled ?? c.is_cancelled,
        is_withdrawn: onChain?.isWithdrawn ?? c.is_withdrawn,
        isExpired: onChain?.isExpired ?? false,
      };
    });

    return sortCampaigns(enriched, sortBy);
  }, [propCampaigns, indexerCampaigns, sortBy, pendingCampaign, onChainMap]);

  const visibleCampaigns = useMemo(
    () => (limit ? allCampaigns.slice(0, limit) : allCampaigns.slice(0, visibleCount)),
    [allCampaigns, visibleCount, limit]
  );

  const hasMore = !limit && allCampaigns.length > visibleCount;
  const isLoading = propIsLoading !== undefined ? propIsLoading : indexerLoading;

  // ─── Loading: initial skeleton ───────────────────────────────────────────
  if (isLoading) {
    return (
      <Box
        id="campaigns"
        py={{ base: 6, md: 8 }}
        scrollMarginTop={{ base: "88px", md: "112px" }}
      >
        <Container maxW="container.xl" px={{ base: 4, md: 8 }}>
          <HStack justify="space-between" mb={6} flexWrap="wrap" gap={4}>
            <Skeleton height="32px" width="180px" borderRadius="md" />
            {showSort && <Skeleton height="40px" width="180px" borderRadius="md" />}
          </HStack>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {Array.from({ length: 6 }).map((_, i) => (
              <CampaignCardSkeleton key={i} />
            ))}
          </SimpleGrid>
        </Container>
      </Box>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────
  if (isError) {
    return (
      <Box
        id="campaigns"
        py={{ base: 6, md: 8 }}
        scrollMarginTop={{ base: "88px", md: "112px" }}
      >
        <Container maxW="container.xl" px={{ base: 4, md: 8 }}>
          <Alert
            status="error"
            borderRadius="xl"
            flexDirection={{ base: "column", sm: "row" }}
            alignItems={{ base: "flex-start", sm: "center" }}
            gap={4}
            p={6}
          >
            <AlertIcon boxSize={5} mt={{ base: "2px", sm: 0 }} />
            <Box flex="1">
              <AlertTitle fontSize="sm" mb={0.5}>
                Could not load campaigns
              </AlertTitle>
              <AlertDescription fontSize="sm" color="text.secondary">
                {fetchError instanceof Error
                  ? fetchError.message
                  : "The indexer could not be reached. Check your connection and try again."}
              </AlertDescription>
            </Box>
            <Button
              size="sm"
              colorScheme="primary"
              variant="outline"
              onClick={() => refetch()}
              isLoading={isFetching}
              flexShrink={0}
            >
              Retry
            </Button>
          </Alert>
        </Container>
      </Box>
    );
  }

  // ─── Empty: confirmed successful empty response ───────────────────────────
  if (allCampaigns.length === 0) {
    return (
      <Box
        id="campaigns"
        py={{ base: 6, md: 8 }}
        scrollMarginTop={{ base: "88px", md: "112px" }}
      >
        <Container maxW="container.xl" px={{ base: 4, md: 8 }}>
          <VStack spacing={5} py={16} textAlign="center">
            <Box
              w={16}
              h={16}
              borderRadius="full"
              bg="bg.accentSubtle"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Box w={6} h={6} borderRadius="full" bg="primary.400" opacity={0.7} />
            </Box>
            <Heading size="md" color="text.primary">
              No campaigns yet
            </Heading>
            <Text color="text.secondary" maxW="380px" fontSize="sm">
              Be the first to create a fundraising campaign and start accepting
              donations in STX and sBTC.
            </Text>
            <Button
              as={NextLink}
              href="/campaigns/new"
              colorScheme="primary"
              size="md"
              _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" }}
            >
              Create First Campaign
            </Button>
          </VStack>
        </Container>
      </Box>
    );
  }

  // ─── Loaded ───────────────────────────────────────────────────────────────
  return (
    <Box
      id="campaigns"
      py={{ base: 6, md: 8 }}
      scrollMarginTop={{ base: "88px", md: "112px" }}
    >
      <Container maxW="container.xl" px={{ base: 4, md: 8 }}>
        {/* Toolbar */}
        <Flex
          justify="space-between"
          align={{ base: "flex-start", sm: "center" }}
          direction={{ base: "column", sm: "row" }}
          gap={3}
          mb={6}
        >
          <Box>
            <Heading size="lg" color="text.primary">
              {title}
            </Heading>
            <Text fontSize="sm" color="text.secondary" mt={0.5}>
              {allCampaigns.length === 1
                ? "1 campaign"
                : `${allCampaigns.length} campaigns`}
              {!limit && allCampaigns.length > PAGE_SIZE && (
                <>, showing {Math.min(visibleCount, allCampaigns.length)}</>
              )}
            </Text>
          </Box>

          {showSort && (
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              aria-label="Sort campaigns"
              size="sm"
              maxW={{ base: "100%", sm: "200px" }}
              bg="bg.surface"
              borderColor="border.default"
              borderRadius="lg"
              minH="40px"
              _hover={{ borderColor: "primary.300" }}
              _focusVisible={{ borderColor: "primary.500", boxShadow: "0 0 0 1px var(--chakra-colors-primary-500)" }}
            >
              <option value="newest">Newest First</option>
              <option value="most-funded">Most Funded</option>
              <option value="ending-soon">Ending Soon</option>
              <option value="most-donors">Most Donors</option>
            </Select>
          )}
        </Flex>

        {/* Background refetch indicator */}
        {isFetching && !isLoading && (
          <Alert
            status="info"
            variant="subtle"
            borderRadius="lg"
            py={2}
            px={4}
            mb={4}
            fontSize="sm"
          >
            <AlertIcon boxSize={4} />
            Refreshing campaigns…
          </Alert>
        )}

        {/* Grid */}
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {visibleCampaigns.map((campaign) => (
            <CampaignCard
              key={campaign.campaign_id === -1 ? `pending-${campaign.owner}` : campaign.campaign_id}
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
              title={campaign.title ?? undefined}
              isPending={campaign.isPending}
            />
          ))}
        </SimpleGrid>

        {/* Load more */}
        {hasMore && (
          <Flex justify="center" mt={8} direction="column" align="center" gap={2}>
            <Button
              variant="outline"
              colorScheme="primary"
              size="md"
              onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              minW="160px"
              _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" }}
            >
              Load more
            </Button>
            <Text fontSize="xs" color="text.tertiary">
              {allCampaigns.length - visibleCount} more campaign
              {allCampaigns.length - visibleCount === 1 ? "" : "s"}
            </Text>
          </Flex>
        )}
      </Container>
    </Box>
  );
}

export default CampaignGrid;
