"use client";

import { useParams } from "next/navigation";
import {
  AspectRatio,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Container,
  Divider,
  Grid,
  GridItem,
  Heading,
  HStack,
  Image,
  Progress,
  Skeleton,
  SkeletonText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import Link from "next/link";

import {
  useCampaignActivity,
  useCampaignFromIndexer,
  useCampaignLeaderboard,
  useIndexerCampaign,
} from "@/hooks/indexerQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { StatusBadge, getCampaignStatus } from "@/components/common/StatusBadge";
import { CombinedAmountDisplay } from "@/components/common/AmountDisplay";
import { CountdownTimer } from "@/components/common/CountdownTimer";
import { AddressDisplay } from "@/components/common/AddressDisplay";
import { WalletIdenticon } from "@/components/common/WalletIdenticon";
import { ActivityFeed } from "@/components/campaign/ActivityFeed";
import { ShareCard } from "@/components/campaign/ShareCard";
import { DonorBadgePanel } from "@/components/campaign/DonorBadgePanel";
import { MilestonesPanel } from "@/components/campaign/MilestonesPanel";
import { RewardsPanel } from "@/components/campaign/RewardsPanel";
import { InlineDonationPanel } from "@/components/campaign/InlineDonationPanel";
import CampaignAdminControls from "@/components/CampaignAdminControls";
import { useAddress } from "@/components/ConnectWallet";

// Shared surface treatment, matching the redesigned card/panel language.
const SURFACE_CARD = {
  bg: "bg.surface",
  borderColor: "border.default",
  borderWidth: "1px",
  borderRadius: "2xl",
  boxShadow: "0 1px 2px rgba(15,23,43,0.04)",
} as const;

// Uppercase micro-label used across the screen.
function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="11px"
      fontWeight="700"
      letterSpacing="0.08em"
      textTransform="uppercase"
      color="text.tertiary"
    >
      {children}
    </Text>
  );
}

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params?.id ? parseInt(params.id as string, 10) : null;

  const { data: prices, isLoading: pricesLoading } = useCurrentPrices();
  const { data: campaign, isLoading, error } = useCampaignFromIndexer(campaignId);
  const { data: indexedCampaign } = useIndexerCampaign(campaignId);
  const {
    data: activity,
    isLoading: activityLoading,
    isError: activityError,
    error: activityFetchError,
    refetch: refetchActivity,
    isFetching: activityRefetching,
  } = useCampaignActivity(campaignId, 20);
  const { data: leaderboard, isLoading: leaderboardLoading } =
    useCampaignLeaderboard(campaignId, 10);

  const currentAddress = useAddress();
  const isOwner =
    currentAddress &&
    campaign?.owner &&
    currentAddress.toLowerCase() === campaign.owner.toLowerCase();
  const hasRefundClaimed = !!(
    currentAddress &&
    activity?.some(
      (ev) =>
        ev.event_name === "refunded" &&
        ev.donor?.toLowerCase() === currentAddress.toLowerCase()
    )
  );

  // Cover image — sourced from indexer metadata when available
  const indexedExtra = indexedCampaign as
    | { cover_url?: string | null; coverUrl?: string | null }
    | null
    | undefined;
  const coverUrl = indexedExtra?.cover_url || indexedExtra?.coverUrl || null;
  const parseAmount = (v: unknown): number => {
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;
    if (typeof v === "string") {
      const n = Number.parseInt(v, 10);
      return Number.isFinite(n) ? n : 0;
    }
    return 0;
  };

  if (isLoading || pricesLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Button as={Link} href="/campaigns" leftIcon={<ArrowBackIcon />} variant="ghost" borderRadius="full" fontWeight="700" mb={6}>
          Back to Campaigns
        </Button>
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8}>
          <GridItem>
            <Skeleton height="260px" borderRadius="xl" mb={6} />
            <VStack spacing={6} align="stretch">
              <Skeleton height="36px" width="60%" />
              <SkeletonText noOfLines={4} spacing={4} />
            </VStack>
          </GridItem>
          <GridItem>
            <Skeleton height="400px" borderRadius="xl" />
          </GridItem>
        </Grid>
      </Container>
    );
  }

  if (error || !campaign) {
    return (
      <Container maxW="container.xl" py={8}>
        <Button as={Link} href="/campaigns" leftIcon={<ArrowBackIcon />} variant="ghost" borderRadius="full" fontWeight="700" mb={6}>
          Back to Campaigns
        </Button>
        <Alert
          status="error"
          variant="subtle"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          textAlign="center"
          height="200px"
          borderRadius="xl"
        >
          <AlertIcon boxSize="40px" mr={0} />
          <AlertTitle mt={4} mb={1} fontSize="lg">
            Campaign Not Found
          </AlertTitle>
          <AlertDescription maxWidth="sm">
            The campaign you&apos;re looking for doesn&apos;t exist or couldn&apos;t be loaded.
          </AlertDescription>
        </Alert>
      </Container>
    );
  }

  const status = getCampaignStatus({
    isCancelled: campaign.isCancelled,
    isWithdrawn: campaign.isWithdrawn,
    isExpired: campaign.isExpired,
  });

  const raisedStxAmount = parseAmount(
    (indexedCampaign as { raised_stx?: string | number | null } | null | undefined)?.raised_stx
  ) || campaign.totalStx;
  const raisedSbtcAmount = parseAmount(
    (indexedCampaign as { raised_sbtc?: string | number | null } | null | undefined)?.raised_sbtc
  ) || campaign.totalSbtc;
  const refundedStxAmount = parseAmount(
    (indexedCampaign as { refunded_stx?: string | number | null } | null | undefined)?.refunded_stx
  );
  const refundedSbtcAmount = parseAmount(
    (indexedCampaign as { refunded_sbtc?: string | number | null } | null | undefined)?.refunded_sbtc
  );

  const stxAmount = raisedStxAmount;
  const sbtcAmount = raisedSbtcAmount;
  const stxPrice = prices?.stx || 0;
  const sbtcPrice = prices?.sbtc || 0;
  const stxUsd = (stxAmount / 1_000_000) * stxPrice;
  const sbtcUsd = (sbtcAmount / 100_000_000) * sbtcPrice;
  const totalUsd = isNaN(stxUsd + sbtcUsd) ? 0 : stxUsd + sbtcUsd;
  const refundedUsd =
    (refundedStxAmount / 1_000_000) * stxPrice +
    (refundedSbtcAmount / 100_000_000) * sbtcPrice;
  const progress =
    campaign.goal > 0 ? Math.min((totalUsd / campaign.goal) * 100, 100) : 0;

  const campaignTitle = indexedCampaign?.title || "Community Fundraiser";

  return (
    <Container maxW="container.xl" py={8}>
      <Button
        as={Link}
        href="/campaigns"
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        borderRadius="full"
        fontWeight="700"
        mb={6}
      >
        Back to Campaigns
      </Button>

      <Grid
        templateColumns={{ base: "1fr", lg: "2fr 1fr" }}
        templateAreas={{
          base: `"header" "sidebar" "content"`,
          lg: `"header sidebar" "content sidebar"`,
        }}
        gap={8}
        alignItems="start"
      >
        {/* ── Left: header ── */}
        <GridItem area="header">
          {coverUrl && (
            <AspectRatio ratio={16 / 9} borderRadius="2xl" overflow="hidden" mb={6}>
              <Image
                src={coverUrl}
                alt={`Cover image for ${campaignTitle}`}
                objectFit="cover"
              />
            </AspectRatio>
          )}

          <VStack spacing={3} align="stretch">
            <HStack spacing={3}>
              <StatusBadge status={status} size="md" />
              {status === "active" && campaign.endAt && (
                <CountdownTimer endAt={campaign.endAt} size="md" />
              )}
            </HStack>

            <Heading size="xl" color="text.primary">
              {campaignTitle}
            </Heading>

            <HStack spacing={{ base: 4, md: 6 }} flexWrap="wrap">
              <HStack spacing={2} minW={0}>
                <MicroLabel>By</MicroLabel>
                <WalletIdenticon address={campaign.owner} size={22} />
                <AddressDisplay address={campaign.owner} size="sm" />
              </HStack>
              <HStack spacing={2} minW={0}>
                <MicroLabel>To</MicroLabel>
                <WalletIdenticon address={campaign.beneficiary} size={22} />
                <AddressDisplay address={campaign.beneficiary} size="sm" />
              </HStack>
            </HStack>

            {indexedCampaign?.description && (
              <Text
                color="text.secondary"
                lineHeight="1.75"
                whiteSpace="pre-wrap"
                fontSize="md"
                pt={1}
              >
                {indexedCampaign.description}
              </Text>
            )}
          </VStack>
        </GridItem>

        {/* ── Left: content ── */}
        <GridItem area="content">
          <VStack spacing={6} align="stretch">
            {isOwner && (
              <CampaignAdminControls
                campaignId={campaign.id}
                campaignIsUninitialized={false}
                campaignIsCancelled={campaign.isCancelled}
                campaignIsExpired={campaign.isExpired}
                campaignIsWithdrawn={campaign.isWithdrawn}
                totalStx={campaign.totalStx}
                totalSbtc={campaign.totalSbtc}
              />
            )}

            <Card {...SURFACE_CARD}>
              <CardHeader pb={0}>
                <Heading size="md">Recent Activity</Heading>
              </CardHeader>
              <CardBody>
                <ActivityFeed
                  events={activity || []}
                  isLoading={activityLoading}
                  isError={activityError}
                  errorMessage={
                    activityFetchError instanceof Error
                      ? activityFetchError.message
                      : "The indexer could not be reached. Check your connection and try again."
                  }
                  onRetry={() => refetchActivity()}
                  isRetrying={activityRefetching}
                  ariaLabel="Recent campaign activity"
                  stxPrice={prices?.stx}
                  sbtcPrice={prices?.sbtc}
                  emptyMessage="No donations yet. Be the first to contribute!"
                />
              </CardBody>
            </Card>
          </VStack>
        </GridItem>

        {/* ── Right: sidebar ── */}
        <GridItem area="sidebar" position={{ lg: "sticky" }} top={{ lg: 6 }}>
          <VStack spacing={5} align="stretch">

            {/* Progress card */}
            <Card {...SURFACE_CARD}>
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Box mb={1}>
                      <MicroLabel>Raised</MicroLabel>
                    </Box>
                    <Text fontWeight="800" color="primary.600" fontSize="2xl" lineHeight="1.1">
                      ${totalUsd.toFixed(2)}
                      <Text as="span" fontSize="sm" fontWeight="500" color="text.tertiary" ml={1}>
                        USD
                      </Text>
                    </Text>
                  </Box>

                  <CombinedAmountDisplay
                    stxAmount={stxAmount}
                    sbtcAmount={sbtcAmount}
                    stxPrice={prices?.stx}
                    sbtcPrice={prices?.sbtc}
                    size="lg"
                  />

                  {campaign.isCancelled && (refundedStxAmount > 0 || refundedSbtcAmount > 0) && (
                    <Box pt={1}>
                      <Box mb={1}>
                        <MicroLabel>Refunded</MicroLabel>
                      </Box>
                      <Text fontWeight="700" color="warning.600" fontSize="lg" lineHeight="1.1">
                        ${refundedUsd.toFixed(2)}
                        <Text as="span" fontSize="sm" fontWeight="500" color="text.tertiary" ml={1}>
                          USD
                        </Text>
                      </Text>
                      <CombinedAmountDisplay
                        stxAmount={refundedStxAmount}
                        sbtcAmount={refundedSbtcAmount}
                        stxPrice={prices?.stx}
                        sbtcPrice={prices?.sbtc}
                        size="sm"
                      />
                    </Box>
                  )}

                  {campaign.goal > 0 && (
                    <Box>
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" color="text.secondary">
                          Goal{" "}
                          <Text as="span" fontWeight="700" color="text.primary">
                            ${campaign.goal.toLocaleString()}
                          </Text>
                        </Text>
                        <Text
                          fontSize="sm"
                          fontWeight="700"
                          color={progress >= 100 ? "success.600" : "primary.700"}
                        >
                          {progress.toFixed(0)}%
                        </Text>
                      </HStack>
                      <Progress
                        value={progress}
                        size="md"
                        borderRadius="full"
                        bg="bg.surfaceAlt"
                        sx={{
                          "& > div": {
                            bg: progress >= 100 ? "success.500" : "primary.500",
                          },
                        }}
                      />
                    </Box>
                  )}

                  <HStack
                    justify="space-around"
                    pt={3}
                    borderTop="1px"
                    borderColor="border.default"
                  >
                    <VStack spacing={0}>
                      <Text fontWeight="700" fontSize="xl" color="chakra-body-text">
                        {campaign.donationCount}
                      </Text>
                      <Text fontSize="sm" color="text.secondary">
                        Donations
                      </Text>
                    </VStack>
                    <Divider orientation="vertical" h="40px" />
                    <VStack spacing={0}>
                      <Text fontWeight="700" fontSize="xl" color="chakra-body-text">
                        {(() => {
                          if (!campaign.endAt) return "Ongoing";
                          const secs = campaign.endAt - campaign.createdAt;
                          const days = Math.floor(secs / 86400);
                          const hours = Math.floor((secs % 86400) / 3600);
                          const mins = Math.floor((secs % 3600) / 60);
                          if (days > 0) return `${days}d`;
                          if (hours > 0) return `${hours}h`;
                          if (mins > 0) return `${mins}m`;
                          return "< 1m";
                        })()}
                      </Text>
                      <Text fontSize="sm" color="text.secondary">
                        Duration
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Inline donation / refund panel */}
            {(status === "active" || status === "cancelled") && !isOwner && (
            <InlineDonationPanel
              campaignId={campaign.id}
              campaignTitle={campaignTitle}
              status={status}
              hasRefundClaimed={hasRefundClaimed}
            />
            )}

            <DonorBadgePanel campaignId={campaign.id} />
            <RewardsPanel campaignId={campaign.id} />
            <MilestonesPanel campaignId={campaign.id} isOwner={!!isOwner} />

            {campaign && (
              <ShareCard
                title={campaignTitle}
                campaignId={campaign.id}
              />
            )}

            {/* Top donors */}
            <Card {...SURFACE_CARD}>
              <CardHeader pb={2}>
                <Heading size="md">Top Donors</Heading>
              </CardHeader>
              <CardBody pt={0}>
                {leaderboardLoading ? (
                  <VStack spacing={3} align="stretch">
                    <Skeleton height="64px" borderRadius="xl" />
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} height="32px" borderRadius="md" />
                    ))}
                  </VStack>
                ) : !leaderboard || leaderboard.length === 0 ? (
                  <Text color="text.secondary" textAlign="center" py={4}>
                    No donors yet
                  </Text>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {/* Hero: top supporter */}
                    <HStack
                      align="center"
                      spacing={3}
                      p={3.5}
                      bg="bg.accentSubtle"
                      borderWidth="1px"
                      borderColor="border.accent"
                      borderRadius="xl"
                    >
                      <WalletIdenticon address={leaderboard[0].donor} size={40} />
                      <VStack align="stretch" spacing={1} flex={1} minW={0}>
                        <MicroLabel>Top supporter</MicroLabel>
                        <AddressDisplay
                          address={leaderboard[0].donor}
                          truncateLength={4}
                          showCopy={false}
                          showExplorer={false}
                          size="sm"
                        />
                        <CombinedAmountDisplay
                          stxAmount={leaderboard[0].total_stx}
                          sbtcAmount={leaderboard[0].total_sbtc}
                          stxPrice={prices?.stx}
                          sbtcPrice={prices?.sbtc}
                          size="sm"
                        />
                      </VStack>
                    </HStack>

                    {/* Remaining ranks */}
                    {leaderboard.length > 1 && (
                      <VStack spacing={0} align="stretch">
                        {leaderboard.slice(1).map((entry, i) => (
                          <HStack
                            key={entry.donor}
                            justify="space-between"
                            align="center"
                            spacing={3}
                            py={2.5}
                            borderTopWidth="1px"
                            borderTopColor="border.subtle"
                          >
                            <HStack spacing={3} minW={0}>
                              <Text
                                fontFamily="mono"
                                fontSize="xs"
                                fontWeight="700"
                                color="text.tertiary"
                                minW="16px"
                                textAlign="center"
                              >
                                {i + 2}
                              </Text>
                              <WalletIdenticon address={entry.donor} size={24} />
                              <AddressDisplay
                                address={entry.donor}
                                truncateLength={4}
                                showCopy={false}
                                showExplorer={false}
                                size="sm"
                              />
                            </HStack>
                            <CombinedAmountDisplay
                              stxAmount={entry.total_stx}
                              sbtcAmount={entry.total_sbtc}
                              stxPrice={prices?.stx}
                              sbtcPrice={prices?.sbtc}
                              size="sm"
                            />
                          </HStack>
                        ))}
                      </VStack>
                    )}
                  </VStack>
                )}
              </CardBody>
            </Card>
          </VStack>
        </GridItem>
      </Grid>
    </Container>
  );
}
