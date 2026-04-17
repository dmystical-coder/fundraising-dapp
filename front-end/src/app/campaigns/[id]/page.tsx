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
  useColorModeValue,
} from "@chakra-ui/react";
import { ArrowBackIcon } from "@chakra-ui/icons";
import Link from "next/link";

import { useCampaignById } from "@/hooks/campaignQueries";
import { useCampaignActivity, useCampaignLeaderboard, useIndexerCampaign } from "@/hooks/indexerQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { StatusBadge, getCampaignStatus } from "@/components/common/StatusBadge";
import { CombinedAmountDisplay } from "@/components/common/AmountDisplay";
import { CountdownTimer } from "@/components/common/CountdownTimer";
import { AddressDisplay } from "@/components/common/AddressDisplay";
import { ActivityFeed } from "@/components/campaign/ActivityFeed";
import { ShareCard } from "@/components/campaign/ShareCard";
import DonationModal from "@/components/DonationModal";
import CampaignAdminControls from "@/components/CampaignAdminControls";
import { useAddress } from "@/components/ConnectWallet";

export default function CampaignDetailPage() {
  const params = useParams();
  const campaignId = params?.id ? parseInt(params.id as string, 10) : null;
  const { isOpen: isDonateOpen, onOpen: onDonateOpen, onClose: onDonateClose } = useDisclosure();

  const { data: prices, isLoading: pricesLoading } = useCurrentPrices();
  const { data: campaign, isLoading, error } = useCampaignById(campaignId, prices);
  const { data: indexedCampaign } = useIndexerCampaign(campaignId);
  const { data: activity, isLoading: activityLoading } = useCampaignActivity(campaignId, 20);
  const { data: leaderboard, isLoading: leaderboardLoading } = useCampaignLeaderboard(campaignId, 10);
  const topDonorBg = useColorModeValue("primary.50", "primary.900");
  
  const currentAddress = useAddress();
  const isOwner = currentAddress && campaign?.owner && 
    currentAddress.toLowerCase() === campaign.owner.toLowerCase();

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

  const stxAmount = indexedCampaign?.total_stx 
    ? parseInt(indexedCampaign.total_stx, 10) 
    : (campaign.totalStx || 0);
  const sbtcAmount = indexedCampaign?.total_sbtc 
    ? parseInt(indexedCampaign.total_sbtc, 10) 
    : (campaign.totalSbtc || 0);
  const stxPrice = prices?.stx || 0;
  const sbtcPrice = prices?.sbtc || 0;
  const stxUsd = (stxAmount / 1_000_000) * stxPrice;
  const sbtcUsd = (sbtcAmount / 100_000_000) * sbtcPrice;
  const totalUsd = isNaN(stxUsd + sbtcUsd) ? 0 : stxUsd + sbtcUsd;
  const progress = campaign.goal > 0 ? Math.min((totalUsd / campaign.goal) * 100, 100) : 0;

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

      <Grid 
        templateColumns={{ base: "1fr", lg: "2fr 1fr" }}
        templateAreas={{
          base: `
            "header"
            "sidebar"
            "content"
          `,
          lg: `
            "header sidebar"
            "content sidebar"
          `
        }}
        gap={8}
        alignItems="start"
      >
        {/* Header Area */}
        <GridItem area="header">
          <VStack spacing={4} align="stretch">
            <HStack spacing={3}>
              <StatusBadge status={status} size="md" />
              {status === "active" && campaign.endAt && (
                <CountdownTimer endAt={campaign.endAt} size="md" />
              )}
            </HStack>
            <Heading size="xl">
              {indexedCampaign?.title || "Community Fundraiser"}
            </Heading>
            <HStack spacing={4} flexWrap="wrap">
              <HStack>
                <Text color="text.secondary" fontSize="sm">Owner:</Text>
                <AddressDisplay address={campaign.owner} size="sm" />
              </HStack>
              <HStack>
                <Text color="text.secondary" fontSize="sm">Beneficiary:</Text>
                <AddressDisplay address={campaign.beneficiary} size="sm" />
              </HStack>
            </HStack>
          </VStack>
        </GridItem>

        {/* Content Area */}
        <GridItem area="content">
          <VStack spacing={6} align="stretch">
            {indexedCampaign?.description && (
              <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="xl">
                <CardBody>
                  <Text color="text.secondary" whiteSpace="pre-wrap">
                    {indexedCampaign.description}
                  </Text>
                </CardBody>
              </Card>
            )}

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

            <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="xl">
              <CardHeader pb={0}>
                <Heading size="md">Recent Activity</Heading>
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

        {/* Sidebar Area */}
        <GridItem area="sidebar" position={{ lg: "sticky" }} top={{ lg: 6 }}>
          <VStack spacing={6} align="stretch">
            <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="xl">
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <HStack justify="space-between">
                    <Text fontWeight="600" color="text.secondary">Amount Raised</Text>
                    <Text fontWeight="700" color="primary.600" fontSize="lg">
                      ${totalUsd.toFixed(2)} USD
                    </Text>
                  </HStack>
                  
                  <CombinedAmountDisplay
                    stxAmount={stxAmount}
                    sbtcAmount={sbtcAmount}
                    stxPrice={prices?.stx}
                    sbtcPrice={prices?.sbtc}
                    size="lg"
                  />

                  {campaign.goal > 0 && (
                    <Box>
                      <HStack justify="space-between" mb={2}>
                        <Text fontSize="sm" color="text.secondary">
                          Goal: ${campaign.goal.toLocaleString()}
                        </Text>
                        <Text fontSize="sm" fontWeight="600" color="text.secondary">
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

                  <HStack justify="space-around" pt={4} borderTop="1px" borderColor="border.default">
                    <VStack spacing={0}>
                      <Text fontWeight="700" fontSize="xl" color="chakra-body-text">
                        {campaign.donationCount}
                      </Text>
                      <Text fontSize="sm" color="text.secondary">Donations</Text>
                    </VStack>
                    <Divider orientation="vertical" h="40px" />
                    <VStack spacing={0}>
                      <Text fontWeight="700" fontSize="xl" color="chakra-body-text">
                        {(() => {
                          if (!campaign.endAt) return "Ongoing";
                          const durationSecs = campaign.endAt - campaign.createdAt;
                          const days = Math.floor(durationSecs / 86400);
                          const hours = Math.floor((durationSecs % 86400) / 3600);
                          const minutes = Math.floor((durationSecs % 3600) / 60);
                          if (days > 0) return `${days} day${days !== 1 ? "s" : ""}`;
                          if (hours > 0) return `${hours} hour${hours !== 1 ? "s" : ""}`;
                          if (minutes > 0) return `${minutes} min${minutes !== 1 ? "s" : ""}`;
                          return "< 1 min";
                        })()}
                      </Text>
                      <Text fontSize="sm" color="text.secondary">Duration</Text>
                    </VStack>
                  </HStack>

                  {status === "active" && !isOwner && (
                    <Box pt={4}>
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
                        campaignTitle={indexedCampaign?.title || "Community Fundraiser"}
                        onClose={onDonateClose}
                      />
                    </Box>
                  )}
                </VStack>
              </CardBody>
            </Card>

            {campaign && (
              <ShareCard 
                title={indexedCampaign?.title || "Community Fundraiser"} 
                campaignId={campaign.id} 
              />
            )}

            <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="xl">
              <CardHeader pb={2}>
                <Heading size="md">Top Donors</Heading>
              </CardHeader>
              <CardBody pt={0}>
                {leaderboardLoading ? (
                  <VStack spacing={3}>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} height="40px" width="100%" borderRadius="md" />
                    ))}
                  </VStack>
                ) : !leaderboard || leaderboard.length === 0 ? (
                  <Text color="text.secondary" textAlign="center" py={4}>
                    No donors yet
                  </Text>
                ) : (
                  <VStack spacing={2} align="stretch">
                    {leaderboard.map((entry, index) => (
                      <HStack
                        key={entry.donor}
                        justify="space-between"
                        p={2}
                        bg={index === 0 ? topDonorBg : "bg.surfaceAlt"}
                        borderRadius="md"
                      >
                        <HStack>
                          <Text
                            fontWeight="700"
                            color={index === 0 ? "primary.600" : "text.secondary"}
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
