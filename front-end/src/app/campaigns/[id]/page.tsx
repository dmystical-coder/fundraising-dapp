"use client";

import { useParams } from "next/navigation";
import {
  Container,
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Progress,
  Button,
  Skeleton,
  SkeletonText,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Divider,
  useDisclosure,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import Link from "next/link";

import { useCampaignById } from "@/hooks/campaignQueries";
import { useCampaignActivity, useCampaignLeaderboard } from "@/hooks/indexerQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { StatusBadge, getCampaignStatus } from "@/components/common/StatusBadge";
import { CombinedAmountDisplay } from "@/components/common/AmountDisplay";
import { CountdownTimer } from "@/components/common/CountdownTimer";
import { AddressDisplay } from "@/components/common/AddressDisplay";
import { ActivityFeed } from "@/components/campaign/ActivityFeed";
import DonationModal from "@/components/DonationModal";
import CampaignAdminControls from "@/components/CampaignAdminControls";

/**
 * Campaign detail page with dynamic routing.
 */
export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params?.id ? parseInt(params.id as string, 10) : null;
  const { isOpen: isDonateOpen, onOpen: onDonateOpen, onClose: onDonateClose } = useDisclosure();

  const { data: prices, isLoading: pricesLoading } = useCurrentPrices();
  const { data: campaign, isLoading, error } = useCampaignById(campaignId, prices);
  const { data: activity, isLoading: activityLoading } = useCampaignActivity(campaignId, 20);
  const { data: leaderboard, isLoading: leaderboardLoading } = useCampaignLeaderboard(campaignId, 10);

  // Loading state
  if (isLoading || pricesLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Button
          as={Link}
          href="/"
          leftIcon={<ArrowBackIcon />}
          variant="ghost"
          mb={6}
        >
          Back to Campaigns
        </Button>
        <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8}>
          <GridItem>
            <VStack spacing={6} align="stretch">
              <Skeleton height="40px" width="60%" />
              <SkeletonText noOfLines={4} spacing={4} />
              <Skeleton height="200px" borderRadius="xl" />
            </VStack>
          </GridItem>
          <GridItem>
            <Skeleton height="400px" borderRadius="xl" />
          </GridItem>
        </Grid>
      </Container>
    );
  }

  // Error state
  if (error || !campaign) {
    return (
      <Container maxW="container.xl" py={8}>
        <Button
          as={Link}
          href="/"
          leftIcon={<ArrowBackIcon />}
          variant="ghost"
          mb={6}
        >
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

  // Calculate progress
  const stxUsd = prices?.stx ? (campaign.totalStx / 1_000_000) * prices.stx : 0;
  const sbtcUsd = prices?.sbtc ? (campaign.totalSbtc / 100_000_000) * prices.sbtc : 0;
  const totalUsd = stxUsd + sbtcUsd;
  const progress = campaign.goal > 0 ? Math.min((totalUsd / campaign.goal) * 100, 100) : 0;

  return (
    <Container maxW="container.xl" py={8}>
      {/* Back button */}
      <Button
        as={Link}
        href="/"
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        mb={6}
      >
        Back to Campaigns
      </Button>

      <Grid templateColumns={{ base: "1fr", lg: "2fr 1fr" }} gap={8}>
        {/* Main content */}
        <GridItem>
          <VStack spacing={6} align="stretch">
            {/* Header */}
            <Box>
              <HStack spacing={3} mb={2}>
                <StatusBadge status={status} size="md" />
                {status === "active" && campaign.endAt && (
                  <CountdownTimer endAt={campaign.endAt} size="md" />
                )}
              </HStack>
              <Heading size="xl" color="gray.800" mb={2}>
                Campaign #{campaign.id}
              </Heading>
              <HStack spacing={4} flexWrap="wrap">
                <HStack>
                  <Text color="gray.500" fontSize="sm">Owner:</Text>
                  <AddressDisplay address={campaign.owner} size="sm" />
                </HStack>
                <HStack>
                  <Text color="gray.500" fontSize="sm">Beneficiary:</Text>
                  <AddressDisplay address={campaign.beneficiary} size="sm" />
                </HStack>
              </HStack>
            </Box>

            {/* Progress card */}
            <Card bg="warm.surface" borderColor="warm.border" borderWidth="1px" borderRadius="xl">
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="600" color="gray.600">Amount Raised</Text>
                    <Text fontWeight="700" color="primary.600" fontSize="lg">
                      ${totalUsd.toFixed(2)} USD
                    </Text>
                  </HStack>
                  
                  <CombinedAmountDisplay
                    stxAmount={campaign.totalStx}
                    sbtcAmount={campaign.totalSbtc}
                    stxPrice={prices?.stx}
                    sbtcPrice={prices?.sbtc}
                    size="lg"
                  />

                  {campaign.goal > 0 && (
                    <Box>
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" color="gray.500">
                          Goal: ${campaign.goal.toLocaleString()}
                        </Text>
                        <Text fontSize="sm" fontWeight="600" color="gray.600">
                          {progress.toFixed(0)}%
                        </Text>
                      </HStack>
                      <Progress
                        value={progress}
                        size="md"
                        borderRadius="full"
                        bg="warm.muted"
                        sx={{
                          "& > div": {
                            bg: progress >= 100 ? "success.500" : "primary.500",
                          },
                        }}
                      />
                    </Box>
                  )}

                  <HStack justify="space-around" pt={4} borderTop="1px" borderColor="warm.border">
                    <VStack spacing={0}>
                      <Text fontWeight="700" fontSize="xl" color="gray.800">
                        {campaign.donationCount}
                      </Text>
                      <Text fontSize="sm" color="gray.500">Donations</Text>
                    </VStack>
                    <Divider orientation="vertical" h="40px" />
                    <VStack spacing={0}>
                      <Text fontWeight="700" fontSize="xl" color="gray.800">
                        {new Date(campaign.createdAt * 1000).toLocaleDateString()}
                      </Text>
                      <Text fontSize="sm" color="gray.500">Created</Text>
                    </VStack>
                  </HStack>
                </VStack>
              </CardBody>
            </Card>

            {/* Admin controls */}
            <CampaignAdminControls
              campaignId={campaign.id}
              campaignIsUninitialized={false}
              campaignIsCancelled={campaign.isCancelled}
              campaignIsExpired={campaign.isExpired}
              campaignIsWithdrawn={campaign.isWithdrawn}
              totalStx={campaign.totalStx}
              totalSbtc={campaign.totalSbtc}
            />

            {/* Activity Feed */}
            <Card bg="warm.surface" borderColor="warm.border" borderWidth="1px" borderRadius="xl">
              <CardHeader pb={0}>
                <Heading size="md" color="gray.700">Recent Activity</Heading>
              </CardHeader>
              <CardBody>
                <ActivityFeed
                  events={activity || []}
                  isLoading={activityLoading}
                  stxPrice={prices?.stx}
                  sbtcPrice={prices?.sbtc}
                  emptyMessage="No donations yet. Be the first to contribute!"
                />
              </CardBody>
            </Card>
          </VStack>
        </GridItem>

        {/* Sidebar */}
        <GridItem>
          <VStack spacing={6} align="stretch" position="sticky" top={6}>
            {/* Donation panel */}
            {status === "active" && (
              <Card bg="warm.surface" borderColor="warm.border" borderWidth="1px" borderRadius="xl">
                <CardHeader>
                  <Heading size="md" color="gray.700">Support This Campaign</Heading>
                </CardHeader>
                <CardBody pt={0}>
                  <Button
                    colorScheme="primary"
                    size="lg"
                    width="100%"
                    onClick={onDonateOpen}
                  >
                    Donate Now
                  </Button>
                  <DonationModal
                    isOpen={isDonateOpen}
                    campaignId={campaign.id}
                    onClose={onDonateClose}
                  />
                </CardBody>
              </Card>
            )}

            {/* Leaderboard */}
            <Card bg="warm.surface" borderColor="warm.border" borderWidth="1px" borderRadius="xl">
              <CardHeader pb={2}>
                <Heading size="md" color="gray.700">Top Donors</Heading>
              </CardHeader>
              <CardBody pt={0}>
                {leaderboardLoading ? (
                  <VStack spacing={3}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} height="40px" width="100%" borderRadius="md" />
                    ))}
                  </VStack>
                ) : !leaderboard || leaderboard.length === 0 ? (
                  <Text color="gray.500" textAlign="center" py={4}>
                    No donors yet
                  </Text>
                ) : (
                  <VStack spacing={2} align="stretch">
                    {leaderboard.map((entry, index) => (
                      <HStack
                        key={entry.donor}
                        justify="space-between"
                        p={2}
                        bg={index === 0 ? "primary.50" : "warm.muted"}
                        borderRadius="md"
                      >
                        <HStack>
                          <Text
                            fontWeight="700"
                            color={index === 0 ? "primary.600" : "gray.600"}
                            minW="24px"
                          >
                            #{index + 1}
                          </Text>
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
              </CardBody>
            </Card>
          </VStack>
        </GridItem>
      </Grid>
    </Container>
  );
}
