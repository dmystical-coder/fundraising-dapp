"use client";

import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  Divider,
  Grid,
  GridItem,
  Heading,
  HStack,
  Icon,
  Link as ChakraLink,
  Skeleton,
  SimpleGrid,
  Text,
  VStack,
} from "@chakra-ui/react";
import { AddIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ConnectWallet, useAddress } from "@/components/ConnectWallet";
import { useMyCampaigns, useMyDonations } from "@/hooks/indexerQueries";
import { fetchCampaignFromChain, CampaignInfo } from "@/hooks/campaignQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { StatusBadge, getCampaignStatus } from "@/components/common/StatusBadge";
import { CombinedAmountDisplay } from "@/components/common/AmountDisplay";
import { SimpleAddress } from "@/components/common/AddressDisplay";

type DashboardPanel = "campaigns" | "donations" | "settings";
type CampaignFilter = "active" | "ended" | "all";

function parseRawAmount(value: number | string): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function DashboardPage() {
  const [activePanel, setActivePanel] = useState<DashboardPanel>("campaigns");
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>("active");

  const address = useAddress();
  const { data: prices } = useCurrentPrices();
  const { data: myCampaigns, isLoading: campaignsLoading } = useMyCampaigns(address);
  const { data: myDonations, isLoading: donationsLoading } = useMyDonations(address);

  const campaigns = useMemo(() => myCampaigns || [], [myCampaigns]);
  const donations = useMemo(() => myDonations || [], [myDonations]);
  const campaignIds = campaigns.map((c) => c.campaign_id);
  const { data: onChainMap } = useQuery<Map<number, CampaignInfo>>({
    queryKey: ["onChainDashboardStatuses", campaignIds],
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
  });

  const campaignsWithStatus = useMemo(() => {
    return campaigns.map((campaign) => {
      const onChain = onChainMap?.get(campaign.campaign_id);
      const status = getCampaignStatus({
        isCancelled: onChain?.isCancelled ?? campaign.is_cancelled,
        isWithdrawn: onChain?.isWithdrawn ?? campaign.is_withdrawn,
        isExpired: onChain?.isExpired ?? false,
      });
      return { ...campaign, status };
    });
  }, [campaigns, onChainMap]);

  const filteredCampaigns = useMemo(() => {
    if (campaignFilter === "all") return campaignsWithStatus;
    if (campaignFilter === "active") {
      return campaignsWithStatus.filter((campaign) => campaign.status === "active");
    }
    return campaignsWithStatus.filter(
      (campaign) => campaign.status === "ended" || campaign.status === "withdrawn" || campaign.status === "cancelled"
    );
  }, [campaignFilter, campaignsWithStatus]);

  const totalRaisedUsd = useMemo(() => {
    return campaigns.reduce((sum, campaign) => {
      const stxRaw = parseRawAmount(campaign.total_stx);
      const sbtcRaw = parseRawAmount(campaign.total_sbtc);
      const stxUsd = (stxRaw / 1_000_000) * (prices?.stx || 0);
      const sbtcUsd = (sbtcRaw / 100_000_000) * (prices?.sbtc || 0);
      return sum + stxUsd + sbtcUsd;
    }, 0);
  }, [campaigns, prices]);

  const totalDonors = useMemo(
    () => campaigns.reduce((sum, campaign) => sum + (campaign.donation_count || 0), 0),
    [campaigns]
  );

  if (!address) {
    return (
      <Box maxW="container.lg" mx="auto" py={16} px={{ base: 4, md: 8 }}>
        <VStack spacing={8} textAlign="center">
          <Box
            w={20}
            h={20}
            borderRadius="full"
            bg="primary.100"
            display="flex"
            alignItems="center"
            justifyContent="center"
            mx="auto"
          >
            <Text fontSize="3xl">👋</Text>
          </Box>
          <VStack spacing={3}>
            <Heading size="xl">
              Your Dashboard
            </Heading>
            <Text color="text.secondary" maxW="400px" fontSize="lg">
              Connect your wallet to view your campaigns, track donations,
              and manage your fundraising activity.
            </Text>
          </VStack>
          <ConnectWallet />
        </VStack>
      </Box>
    );
  }

  return (
    <Box maxW="container.xl" mx="auto" py={8} px={{ base: 4, md: 8 }}>
      <Grid templateColumns={{ base: "1fr", lg: "220px 1fr" }} gap={{ base: 6, lg: 8 }}>
        <GridItem>
          <Card borderWidth="1px" borderColor="border.default" borderRadius="xl" bg="bg.surfaceAlt">
            <CardBody p={0}>
              <VStack align="stretch" spacing={0}>
                <Box px={4} py={4} borderBottomWidth="1px" borderColor="border.default">
                  <HStack
                    display="inline-flex"
                    spacing={2}
                    borderWidth="1px"
                    borderColor="border.default"
                    borderRadius="full"
                    px={3}
                    py={1.5}
                    bg="bg.surface"
                  >
                    <Box w={2} h={2} borderRadius="full" bg="primary.500" />
                    <SimpleAddress address={address} length={4} fontSize="xs" />
                  </HStack>
                </Box>

                {(
                  [
                    { id: "campaigns", label: "My Campaigns" },
                    { id: "donations", label: "My Donations" },
                    { id: "settings", label: "Settings" },
                  ] as Array<{ id: DashboardPanel; label: string }>
                ).map((item) => {
                  const isActive = activePanel === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      justifyContent="flex-start"
                      borderRadius="none"
                      py={6}
                      px={4}
                      borderLeftWidth="3px"
                      borderLeftColor={isActive ? "primary.500" : "transparent"}
                      bg={isActive ? "bg.surface" : "transparent"}
                      fontWeight={isActive ? "700" : "500"}
                      color={isActive ? "chakra-body-text" : "text.secondary"}
                      onClick={() => setActivePanel(item.id)}
                    >
                      {item.label}
                    </Button>
                  );
                })}

                <Divider />
                <Button
                  as={Link}
                  href="/"
                  variant="ghost"
                  justifyContent="flex-start"
                  borderRadius="none"
                  py={6}
                  px={4}
                  color="text.secondary"
                  fontWeight="500"
                >
                  Browse Campaigns
                </Button>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <HStack justify="space-between" align="start" mb={6} flexWrap="wrap" gap={4}>
            <Box>
              <Heading size="lg">
                {activePanel === "campaigns"
                  ? "My Campaigns"
                  : activePanel === "donations"
                  ? "My Donations"
                  : "Settings"}
              </Heading>
              <Text fontSize="sm" color="text.secondary" mt={1}>
                {activePanel === "campaigns"
                  ? "Manage your fundraising campaigns"
                  : activePanel === "donations"
                  ? "Track your recent contributions"
                  : "Dashboard preferences and settings"}
              </Text>
            </Box>
            <Button as={Link} href="/campaigns/new" leftIcon={<AddIcon />} colorScheme="primary">
              Create Campaign
            </Button>
          </HStack>

          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3} mb={6}>
            <Card borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.surface">
              <CardBody py={4}>
                <Text fontSize="xs" color="text.tertiary" textTransform="uppercase" letterSpacing="0.08em">
                  Total Raised
                </Text>
                <Text fontSize="2xl" fontWeight="700" color="chakra-body-text" mt={1}>
                  ${totalRaisedUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Text>
              </CardBody>
            </Card>
            <Card borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.surface">
              <CardBody py={4}>
                <Text fontSize="xs" color="text.tertiary" textTransform="uppercase" letterSpacing="0.08em">
                  Campaigns
                </Text>
                <Text fontSize="2xl" fontWeight="700" color="chakra-body-text" mt={1}>
                  {campaigns.length}
                </Text>
              </CardBody>
            </Card>
            <Card borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.surface">
              <CardBody py={4}>
                <Text fontSize="xs" color="text.tertiary" textTransform="uppercase" letterSpacing="0.08em">
                  Total Donors
                </Text>
                <Text fontSize="2xl" fontWeight="700" color="chakra-body-text" mt={1}>
                  {totalDonors}
                </Text>
              </CardBody>
            </Card>
          </SimpleGrid>

          {activePanel === "campaigns" && (
            <>
              <HStack spacing={2} borderBottomWidth="1px" borderColor="border.default" mb={4} pb={1}>
                {(
                  [
                    { id: "active", label: "Active", count: campaignsWithStatus.filter((c) => c.status === "active").length },
                    {
                      id: "ended",
                      label: "Ended",
                      count: campaignsWithStatus.filter((c) => c.status !== "active").length,
                    },
                    { id: "all", label: "All", count: campaignsWithStatus.length },
                  ] as Array<{ id: CampaignFilter; label: string; count: number }>
                ).map((tab) => {
                  const selected = campaignFilter === tab.id;
                  return (
                    <Button
                      key={tab.id}
                      variant="ghost"
                      borderRadius="none"
                      borderBottomWidth="3px"
                      borderBottomColor={selected ? "primary.500" : "transparent"}
                      color={selected ? "chakra-body-text" : "text.secondary"}
                      fontWeight={selected ? "700" : "500"}
                      onClick={() => setCampaignFilter(tab.id)}
                      px={3}
                      py={2}
                    >
                      {tab.label}
                      <Badge ml={2} colorScheme={selected ? "primary" : "gray"} borderRadius="full">
                        {tab.count}
                      </Badge>
                    </Button>
                  );
                })}
              </HStack>

              {campaignsLoading ? (
                <VStack align="stretch" spacing={3}>
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height="84px" borderRadius="lg" />
                  ))}
                </VStack>
              ) : filteredCampaigns.length === 0 ? (
                <Card bg="bg.surfaceAlt" borderRadius="xl" borderWidth="1px" borderColor="border.default">
                  <CardBody py={10} textAlign="center">
                    <VStack spacing={3}>
                      <Text fontSize="3xl">📭</Text>
                      <Heading size="md">No campaigns in this view</Heading>
                      <Text color="text.secondary">
                        Try another filter or create a new campaign.
                      </Text>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <VStack align="stretch" spacing={3}>
                  {filteredCampaigns.map((campaign) => (
                    <Card
                      key={campaign.campaign_id}
                      as={Link}
                      href={`/campaigns/${campaign.campaign_id}`}
                      borderWidth="1px"
                      borderColor="border.default"
                      borderRadius="lg"
                      bg="bg.surface"
                      _hover={{ borderColor: "border.accent", boxShadow: "sm" }}
                    >
                      <CardBody py={4}>
                        <HStack justify="space-between" align="center" gap={4} flexWrap="wrap">
                          <HStack spacing={3} minW={0}>
                            <Box
                              w={14}
                              h={12}
                              borderWidth="1px"
                              borderColor="border.default"
                              borderRadius="md"
                              bg="bg.surfaceAlt"
                              flexShrink={0}
                            />
                            <VStack align="start" spacing={0} minW={0}>
                              <Text fontWeight="700" noOfLines={1}>
                                {campaign.title || `Campaign #${campaign.campaign_id}`}
                              </Text>
                              <HStack spacing={2} flexWrap="wrap">
                                <StatusBadge status={campaign.status} size="sm" />
                                <Text fontSize="xs" color="text.tertiary">
                                  {campaign.donation_count} donors
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>

                          <VStack align={{ base: "start", md: "end" }} spacing={0}>
                            <CombinedAmountDisplay
                              stxAmount={campaign.total_stx}
                              sbtcAmount={campaign.total_sbtc}
                              stxPrice={prices?.stx}
                              sbtcPrice={prices?.sbtc}
                              size="sm"
                            />
                            <Text fontSize="xs" color="text.tertiary">
                              Created {new Date(campaign.created_at).toLocaleDateString()}
                            </Text>
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}
                </VStack>
              )}
            </>
          )}

          {activePanel === "donations" && (
            <>
              {donationsLoading ? (
                <VStack spacing={3} align="stretch">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} height="80px" width="100%" borderRadius="xl" />
                  ))}
                </VStack>
              ) : donations.length === 0 ? (
                <Card bg="bg.surfaceAlt" borderRadius="xl" borderWidth="1px" borderColor="border.default">
                  <CardBody py={12} textAlign="center">
                    <VStack spacing={4}>
                      <Text fontSize="4xl">💝</Text>
                      <Heading size="md">No Donations Yet</Heading>
                      <Text color="text.secondary" maxW="300px">
                        You haven&apos;t made any donations yet.
                      </Text>
                      <Button as={Link} href="/" colorScheme="primary">
                        Browse Campaigns
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <VStack spacing={3} align="stretch">
                  {donations.map((donation, index) => {
                    const isStx = donation.event_name === "donated-stx";
                    const explorerUrl = donation.txid
                      ? `https://explorer.stacks.co/txid/${donation.txid}`
                      : null;

                    return (
                      <Card
                        key={`${donation.txid}-${index}`}
                        bg="bg.surface"
                        borderWidth="1px"
                        borderColor="border.default"
                        borderRadius="xl"
                      >
                        <CardBody py={4}>
                          <HStack justify="space-between" flexWrap="wrap" gap={3}>
                            <VStack align="start" spacing={0}>
                              <HStack>
                                <Text fontWeight="600" color="chakra-body-text">
                                  Donated to Campaign #{donation.campaign_id}
                                </Text>
                                <ChakraLink as={Link} href={`/campaigns/${donation.campaign_id}`} color="primary.500" fontSize="sm">
                                  View →
                                </ChakraLink>
                              </HStack>
                              <Text fontSize="sm" color="text.secondary">
                                {new Date(donation.inserted_at).toLocaleString()}
                              </Text>
                            </VStack>

                            <HStack spacing={3}>
                              <CombinedAmountDisplay
                                stxAmount={isStx ? donation.amount : "0"}
                                sbtcAmount={!isStx ? donation.amount : "0"}
                                stxPrice={prices?.stx}
                                sbtcPrice={prices?.sbtc}
                                size="sm"
                              />
                              {explorerUrl && (
                                <ChakraLink href={explorerUrl} isExternal color="primary.500" fontSize="sm" aria-label="Open transaction in explorer">
                                  <Icon as={ExternalLinkIcon} />
                                </ChakraLink>
                              )}
                            </HStack>
                          </HStack>
                        </CardBody>
                      </Card>
                    );
                  })}
                </VStack>
              )}
            </>
          )}

          {activePanel === "settings" && (
            <Card borderWidth="1px" borderColor="border.default" borderRadius="xl" bg="bg.surfaceAlt">
              <CardBody py={10}>
                <VStack spacing={3} textAlign="center">
                  <Text fontSize="3xl">⚙️</Text>
                  <Heading size="md">Settings coming soon</Heading>
                  <Text color="text.secondary">Account and dashboard preferences will appear here.</Text>
                </VStack>
              </CardBody>
            </Card>
          )}
        </GridItem>
      </Grid>
    </Box>
  );
}
