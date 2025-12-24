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

import { ConnectWallet, useAddress } from "@/components/ConnectWallet";
import { useMyCampaigns, useMyDonations } from "@/hooks/indexerQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { StatusBadge, getCampaignStatus } from "@/components/common/StatusBadge";
import { CombinedAmountDisplay } from "@/components/common/AmountDisplay";
import { SimpleAddress } from "@/components/common/AddressDisplay";

/**
 * User dashboard page showing personal campaigns and donations.
 */
export default function DashboardPage() {
  const address = useAddress();
  const { data: prices } = useCurrentPrices();
  const { data: myCampaigns, isLoading: campaignsLoading } = useMyCampaigns(address);
  const { data: myDonations, isLoading: donationsLoading } = useMyDonations(address);

  // Not connected state
  if (!address) {
    return (
      <Container maxW="container.lg" py={12}>
        <VStack spacing={6} textAlign="center">
          <Heading size="xl" color="gray.800">
            Your Dashboard
          </Heading>
          <Text color="gray.600" maxW="400px">
            Connect your wallet to view your campaigns and donation history.
          </Text>
          <ConnectWallet />
        </VStack>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      {/* Header */}
      <HStack justify="space-between" mb={8} flexWrap="wrap" gap={4}>
        <Box>
          <Heading size="xl" color="gray.800" mb={1}>
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

      {/* Tabs */}
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
          {/* My Campaigns Tab */}
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
                    <Heading size="md" color="gray.700">
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
                  const status = getCampaignStatus({
                    isCancelled: campaign.is_cancelled,
                    isWithdrawn: campaign.is_withdrawn,
                    isExpired: false, // Would need endAt from on-chain
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
                          <Heading size="md" color="gray.800">
                            Campaign #{campaign.campaign_id}
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
                              <Text fontSize="sm" fontWeight="600" color="gray.700">
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

          {/* My Donations Tab */}
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
                    <Heading size="md" color="gray.700">
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
                                <Text fontWeight="600" color="gray.800">
                                  Donated to Campaign #{donation.campaign_id}
                                </Text>
                                <ChakraLink
                                  as={Link}
                                  href={`/campaigns/${donation.campaign_id}`}
                                  color="secondary.500"
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
                                color="secondary.500"
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
