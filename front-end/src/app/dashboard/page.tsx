"use client";

import {
  Container,
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Tab,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Card,
  CardBody,
  SimpleGrid,
  Button,
  Badge,
  Skeleton,
  Divider,
  Link as ChakraLink,
} from "@chakra-ui/react";
import { AddIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import Link from "next/link";

import { useQuery } from "@tanstack/react-query";
import { ConnectWallet, useAddress } from "@/components/ConnectWallet";
import { useMyCampaigns, useMyDonations } from "@/hooks/indexerQueries";
import { fetchCampaignFromChain, CampaignInfo } from "@/hooks/campaignQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { StatusBadge, getCampaignStatus } from "@/components/common/StatusBadge";
import { CombinedAmountDisplay } from "@/components/common/AmountDisplay";
import { SimpleAddress } from "@/components/common/AddressDisplay";

export default function DashboardPage() {
  const address = useAddress();
  const { data: prices } = useCurrentPrices();
  const { data: myCampaigns, isLoading: campaignsLoading } = useMyCampaigns(address);
  const { data: myDonations, isLoading: donationsLoading } = useMyDonations(address);

  const campaignIds = (myCampaigns || []).map((c) => c.campaign_id);
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

  if (!address) {
    return (
      <Container maxW="container.lg" py={16}>
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
            <Text color="gray.500" maxW="400px" fontSize="lg">
              Connect your wallet to view your campaigns, track donations,
              and manage your fundraising activity.
            </Text>
          </VStack>
          <ConnectWallet />
          <VStack spacing={2} pt={4}>
            <Text fontSize="sm" color="gray.400">
              Preview what you can do:
            </Text>
            <HStack spacing={6} flexWrap="wrap" justify="center">
              {["View your campaigns", "Track donations", "Manage withdrawals"].map((item) => (
                <HStack key={item} spacing={1.5}>
                  <Text color="primary.400" fontSize="sm">✓</Text>
                  <Text fontSize="sm" color="gray.500">{item}</Text>
                </HStack>
              ))}
            </HStack>
          </VStack>
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <HStack justify="space-between" mb={8} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="xl" mb={1}>
            Dashboard
          </Heading>
          <HStack>
            <Text color="gray.500">Connected:</Text>
            <SimpleAddress address={address} length={6} fontWeight="500" />
          </HStack>
        </Box>
        <Button
          as={Link}
          href="/campaigns/new"
          leftIcon={<AddIcon />}
          colorScheme="primary"
        >
          Create Campaign
        </Button>
      </HStack>

      <Tabs colorScheme="primary" variant="enclosed">
        <TabList>
          <Tab fontWeight="600">
            My Campaigns
            {myCampaigns && myCampaigns.length > 0 && (
              <Badge ml={2} colorScheme="primary" borderRadius="full">
                {myCampaigns.length}
              </Badge>
            )}
          </Tab>
          <Tab fontWeight="600">
            My Donations
            {myDonations && myDonations.length > 0 && (
              <Badge ml={2} colorScheme="secondary" borderRadius="full">
                {myDonations.length}
              </Badge>
            )}
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0} pt={6}>
            {campaignsLoading ? (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {[1, 2].map((i) => (
                  <Skeleton key={i} height="180px" borderRadius="xl" />
                ))}
              </SimpleGrid>
            ) : !myCampaigns || myCampaigns.length === 0 ? (
              <Card bg="warm.muted" borderRadius="xl" borderWidth="1px" borderColor="warm.border">
                <CardBody py={12} textAlign="center">
                  <VStack spacing={4}>
                    <Text fontSize="4xl">🎯</Text>
                    <Heading size="md">
                      No Campaigns Yet
                    </Heading>
                    <Text color="gray.500" maxW="300px">
                      You haven&apos;t created any campaigns. Start your first fundraising campaign today!
                    </Text>
                    <Button
                      as={Link}
                      href="/campaigns/new"
                      colorScheme="primary"
                      leftIcon={<AddIcon />}
                    >
                      Create Campaign
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                {myCampaigns.map((campaign) => {
                  const onChain = onChainMap?.get(campaign.campaign_id);
                  const status = getCampaignStatus({
                    isCancelled: onChain?.isCancelled ?? campaign.is_cancelled,
                    isWithdrawn: onChain?.isWithdrawn ?? campaign.is_withdrawn,
                    isExpired: onChain?.isExpired ?? false,
                  });

                  return (
                    <Card
                      key={campaign.campaign_id}
                      as={Link}
                      href={`/campaigns/${campaign.campaign_id}`}
                      bg="warm.surface"
                      borderWidth="1px"
                      borderColor="warm.border"
                      borderRadius="xl"
                      _hover={{ boxShadow: "md", borderColor: "primary.200" }}
                      transition="all 0.2s"
                      cursor="pointer"
                    >
                      <CardBody>
                        <HStack justify="space-between" mb={3}>
                          <Heading size="md">
                            {campaign.title || `Campaign #${campaign.campaign_id}`}
                          </Heading>
                          <StatusBadge status={status} size="sm" />
                        </HStack>

                        <VStack align="stretch" spacing={3}>
                          <Box>
                            <Text fontSize="sm" color="gray.500" mb={1}>Raised</Text>
                            <CombinedAmountDisplay
                              stxAmount={campaign.total_stx}
                              sbtcAmount={campaign.total_sbtc}
                              stxPrice={prices?.stx}
                              sbtcPrice={prices?.sbtc}
                              size="md"
                            />
                          </Box>

                          <Divider borderColor="warm.border" />

                          <HStack justify="space-between">
                            <HStack>
                              <Text fontSize="sm" fontWeight="600" color="chakra-body-text">
                                {campaign.donation_count}
                              </Text>
                              <Text fontSize="sm" color="gray.500">
                                donations
                              </Text>
                            </HStack>
                            <Text fontSize="sm" color="gray.400">
                              {new Date(campaign.created_at).toLocaleDateString()}
                            </Text>
                          </HStack>
                        </VStack>
                      </CardBody>
                    </Card>
                  );
                })}
              </SimpleGrid>
            )}
          </TabPanel>

          <TabPanel px={0} pt={6}>
            {donationsLoading ? (
              <VStack spacing={3}>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} height="80px" width="100%" borderRadius="xl" />
                ))}
              </VStack>
            ) : !myDonations || myDonations.length === 0 ? (
              <Card bg="warm.muted" borderRadius="xl" borderWidth="1px" borderColor="warm.border">
                <CardBody py={12} textAlign="center">
                  <VStack spacing={4}>
                    <Text fontSize="4xl">💝</Text>
                    <Heading size="md">
                      No Donations Yet
                    </Heading>
                    <Text color="gray.500" maxW="300px">
                      You haven&apos;t made any donations. Browse campaigns and support a cause you believe in!
                    </Text>
                    <Button as={Link} href="/" colorScheme="primary">
                      Browse Campaigns
                    </Button>
                  </VStack>
                </CardBody>
              </Card>
            ) : (
              <VStack spacing={3} align="stretch">
                {myDonations.map((donation, index) => {
                  const isStx = donation.event_name === "donated-stx";
                  const explorerUrl = donation.txid
                    ? `https://explorer.stacks.co/txid/${donation.txid}`
                    : null;

                  return (
                    <Card
                      key={`${donation.txid}-${index}`}
                      bg="warm.surface"
                      borderWidth="1px"
                      borderColor="warm.border"
                      borderRadius="xl"
                    >
                      <CardBody py={4}>
                        <HStack justify="space-between" flexWrap="wrap" gap={3}>
                          <HStack spacing={4}>
                            <Box
                              w={10}
                              h={10}
                              borderRadius="full"
                              bg={isStx ? "primary.100" : "warning.100"}
                              display="flex"
                              alignItems="center"
                              justifyContent="center"
                            >
                              <Text>{isStx ? "💰" : "🪙"}</Text>
                            </Box>
                            <VStack align="start" spacing={0}>
                              <HStack>
                                <Text fontWeight="600" color="chakra-body-text">
                                  Donated to Campaign #{donation.campaign_id}
                                </Text>
                                <ChakraLink
                                  as={Link}
                                  href={`/campaigns/${donation.campaign_id}`}
                                  color="primary.500"
                                  fontSize="sm"
                                >
                                  View →
                                </ChakraLink>
                              </HStack>
                              <Text fontSize="sm" color="gray.500">
                                {new Date(donation.inserted_at).toLocaleString()}
                              </Text>
                            </VStack>
                          </HStack>

                          <HStack spacing={4}>
                            <CombinedAmountDisplay
                              stxAmount={isStx ? donation.amount : "0"}
                              sbtcAmount={!isStx ? donation.amount : "0"}
                              stxPrice={prices?.stx}
                              sbtcPrice={prices?.sbtc}
                              size="md"
                            />
                            {explorerUrl && (
                              <ChakraLink
                                href={explorerUrl}
                                isExternal
                                color="primary.500"
                                fontSize="sm"
                              >
                                <ExternalLinkIcon />
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
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Container>
  );
}
