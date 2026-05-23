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
  Link as ChakraLink,
  Skeleton,
  SimpleGrid,
  Text,
  VStack,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { ConnectWallet, useAddress } from "@/components/ConnectWallet";
import {
  useMyCampaigns,
  useMyDonations,
  useMyUniqueSupporters,
} from "@/hooks/indexerQueries";
import { fetchCampaignFromChain, CampaignInfo } from "@/hooks/campaignQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { isMainnetEnvironment } from "@/lib/contract-utils";
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
  const { data: uniqueSupporters } = useMyUniqueSupporters(address);

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

  const lifetimeRaisedUsd = useMemo(() => {
    return campaigns.reduce((sum, campaign) => {
      const stxRaw = parseRawAmount(campaign.total_stx);
      const sbtcRaw = parseRawAmount(campaign.total_sbtc);
      const stxUsd = (stxRaw / 1_000_000) * (prices?.stx || 0);
      const sbtcUsd = (sbtcRaw / 100_000_000) * (prices?.sbtc || 0);
      return sum + stxUsd + sbtcUsd;
    }, 0);
  }, [campaigns, prices]);

  const currentlyHeldUsd = useMemo(() => {
    if (!onChainMap) return 0;
    return Array.from(onChainMap.values()).reduce((sum, c) => {
      const stxUsd = (c.totalStx / 1_000_000) * (prices?.stx || 0);
      const sbtcUsd = (c.totalSbtc / 100_000_000) * (prices?.sbtc || 0);
      return sum + stxUsd + sbtcUsd;
    }, 0);
  }, [onChainMap, prices]);

  const donorAppearances = useMemo(
    () => campaigns.reduce((sum, campaign) => sum + (campaign.donor_count ?? 0), 0),
    [campaigns]
  );

  const endedAwaitingWithdrawal = useMemo(() => {
    return campaignsWithStatus.filter((c) => {
      if (c.status !== "ended") return false;
      const onChain = onChainMap?.get(c.campaign_id);
      return !(onChain?.isWithdrawn ?? c.is_withdrawn);
    });
  }, [campaignsWithStatus, onChainMap]);

  const cancelledWithDonors = useMemo(() => {
    return campaignsWithStatus.filter(
      (c) => c.status === "cancelled" && (c.donor_count ?? 0) > 0
    );
  }, [campaignsWithStatus]);

  if (!address) {
    return (
      <Box maxW="container.md" mx="auto" py={{ base: 10, md: 14 }} px={{ base: 4, md: 8 }}>
        <VStack spacing={6} textAlign="center" align="center">
          <Box
            w={16}
            h={16}
            borderRadius="full"
            bg="primary.100"
            display="flex"
            alignItems="center"
            justifyContent="center"
            aria-hidden
          >
            <Text fontSize="2xl">👋</Text>
          </Box>
          <VStack spacing={2}>
            <Heading as="h1" size="xl">
              Your dashboard
            </Heading>
            {isMainnetEnvironment() ? (
              <Badge variant="active" fontSize="xs">
                Stacks mainnet
              </Badge>
            ) : null}
            <Text color="text.secondary" maxW="md" fontSize="md" lineHeight="1.6">
              Connect your wallet to see your campaigns, donations, and activity in
              one place.
            </Text>
            <Text fontSize="sm" color="text.tertiary" maxW="md">
              Non-custodial — you approve actions in your wallet. FundStacks never
              holds your keys or funds.
            </Text>
          </VStack>
          <ConnectWallet size="lg" w={{ base: "full", sm: "auto" }} maxW="sm" />
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

          {(endedAwaitingWithdrawal.length > 0 || cancelledWithDonors.length > 0) && (
            <VStack align="stretch" spacing={3} mb={6}>
              {endedAwaitingWithdrawal.length > 0 && (
                <Alert status="warning" borderRadius="lg" borderWidth="1px" borderColor="border.default">
                  <AlertIcon />
                  <HStack justify="space-between" w="full" flexWrap="wrap" gap={3}>
                    <Text fontSize="sm" color="chakra-body-text">
                      {endedAwaitingWithdrawal.length} ended campaign
                      {endedAwaitingWithdrawal.length === 1 ? "" : "s"} may be ready for withdrawal.
                    </Text>
                    <Button size="sm" as={Link} href={`/campaigns/${endedAwaitingWithdrawal[0].campaign_id}`} colorScheme="primary">
                      Review
                    </Button>
                  </HStack>
                </Alert>
              )}
              {cancelledWithDonors.length > 0 && (
                <Alert status="info" borderRadius="lg" borderWidth="1px" borderColor="border.default">
                  <AlertIcon />
                  <Text fontSize="sm" color="chakra-body-text">
                    {cancelledWithDonors.length} cancelled campaign{cancelledWithDonors.length === 1 ? "" : "s"} have donor refunds in progress.
                  </Text>
                </Alert>
              )}
            </VStack>
          )}

          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3} mb={6}>
            <Card borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.surface">
              <CardBody py={4}>
                <Text fontSize="sm" fontWeight="600" color="text.secondary">Lifetime Raised</Text>
                <Text fontSize="2xl" fontWeight="800" color="primary.600" mt={0.5} lineHeight="1.1">
                  ${lifetimeRaisedUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Text>
                <Text fontSize="xs" color="text.tertiary" mt={0.5}>Across all your campaigns</Text>
              </CardBody>
            </Card>
            <Card borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.surface">
              <CardBody py={4}>
                <Text fontSize="sm" fontWeight="600" color="text.secondary">Currently Held</Text>
                <Text fontSize="2xl" fontWeight="800" color="secondary.600" mt={0.5} lineHeight="1.1">
                  ${currentlyHeldUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </Text>
                <Text fontSize="xs" color="text.tertiary" mt={0.5}>Still in active/cancelled contracts</Text>
              </CardBody>
            </Card>
            <Card borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.surface">
              <CardBody py={4}>
                <Text fontSize="sm" fontWeight="600" color="text.secondary">Campaigns</Text>
                <Text fontSize="2xl" fontWeight="800" color="chakra-body-text" mt={0.5} lineHeight="1.1">
                  {campaigns.length}
                </Text>
                <Text fontSize="xs" color="text.tertiary" mt={0.5}>
                  {campaignsWithStatus.filter((c) => c.status === "active").length} active
                </Text>
              </CardBody>
            </Card>
            <Card borderWidth="1px" borderColor="border.default" borderRadius="lg" bg="bg.surface">
              <CardBody py={4}>
                <Text fontSize="sm" fontWeight="600" color="text.secondary">Supporters</Text>
                <Text fontSize="2xl" fontWeight="800" color="secondary.600" mt={0.5} lineHeight="1.1">
                  {uniqueSupporters ?? donorAppearances}
                </Text>
                <Text fontSize="xs" color="text.tertiary" mt={0.5}>
                  Unique wallets across your campaigns
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
                    <VStack spacing={2}>
                      <Heading size="md">No campaigns here</Heading>
                      <Text color="text.secondary" fontSize="sm">
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
                            <VStack align="start" spacing={0} minW={0}>
                              <Text fontWeight="700" noOfLines={1}>
                                {campaign.title || `Campaign #${campaign.campaign_id}`}
                              </Text>
                              <HStack spacing={2} flexWrap="wrap">
                                <StatusBadge status={campaign.status} size="sm" />
                                <Text fontSize="xs" color="text.tertiary">
                                  {campaign.donor_count ?? 0} donors
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
                    <VStack spacing={3}>
                      <Heading size="md">No donations yet</Heading>
                      <Text color="text.secondary" fontSize="sm" maxW="300px">
                        You haven&apos;t made any donations yet.
                      </Text>
                      <Button as={Link} href="/" colorScheme="primary">
                        Browse Campaigns
                      </Button>
                    </VStack>
                  </CardBody>
                </Card>
              ) : (
                <Card borderWidth="1px" borderColor="border.default" borderRadius="xl" bg="bg.surface">
                  <CardBody p={0}>
                    <VStack spacing={0} align="stretch" divider={<Divider borderColor="border.subtle" />}>
                      {donations.map((donation, index) => {
                        const isStx = donation.event_name === "donated-stx";
                        const explorerUrl = donation.txid
                          ? `https://explorer.stacks.co/txid/${donation.txid}`
                          : null;

                        return (
                          <HStack
                            key={`${donation.txid}-${index}`}
                            px={4}
                            py={3}
                            justify="space-between"
                            flexWrap="wrap"
                            gap={2}
                          >
                            <VStack align="start" spacing={0}>
                              <HStack spacing={1.5}>
                                <ChakraLink
                                  as={Link}
                                  href={`/campaigns/${donation.campaign_id}`}
                                  fontWeight="600"
                                  fontSize="sm"
                                  color="chakra-body-text"
                                  _hover={{ color: "primary.600" }}
                                >
                                  Campaign #{donation.campaign_id}
                                </ChakraLink>
                              </HStack>
                              <Text fontSize="xs" color="text.tertiary">
                                {new Date(donation.inserted_at).toLocaleDateString()}
                              </Text>
                            </VStack>

                            <HStack spacing={2}>
                              <CombinedAmountDisplay
                                stxAmount={isStx ? donation.amount : "0"}
                                sbtcAmount={!isStx ? donation.amount : "0"}
                                stxPrice={prices?.stx}
                                sbtcPrice={prices?.sbtc}
                                size="sm"
                              />
                              {explorerUrl && (
                                <ChakraLink
                                  href={explorerUrl}
                                  isExternal
                                  color="primary.500"
                                  fontSize="sm"
                                  aria-label="View transaction"
                                  _hover={{ color: "primary.700" }}
                                >
                                  ↗
                                </ChakraLink>
                              )}
                            </HStack>
                          </HStack>
                        );
                      })}
                    </VStack>
                  </CardBody>
                </Card>
              )}
            </>
          )}

          {activePanel === "settings" && (
            <Card borderWidth="1px" borderColor="border.default" borderRadius="xl" bg="bg.surfaceAlt">
              <CardBody py={10}>
                <VStack spacing={2} textAlign="center">
                  <Heading size="md">Settings coming soon</Heading>
                  <Text color="text.secondary" fontSize="sm">Account and dashboard preferences will appear here.</Text>
                </VStack>
              </CardBody>
            </Card>
          )}
        </GridItem>
      </Grid>
    </Box>
  );
}
