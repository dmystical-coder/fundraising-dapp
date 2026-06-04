"use client";

import {
  Badge,
  Box,
  Button,
  Divider,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Grid,
  GridItem,
  Heading,
  HStack,
  IconButton,
  Link as ChakraLink,
  Skeleton,
  SimpleGrid,
  Stack,
  StackDivider,
  Text,
  useDisclosure,
  VStack,
} from "@chakra-ui/react";
import { AddIcon, HamburgerIcon } from "@chakra-ui/icons";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { useQuery } from "@tanstack/react-query";
import { ConnectWallet, useAddress } from "@/components/ConnectWallet";
import {
  useMyCampaigns,
  useMyDonations,
  useMyUniqueSupporters,
} from "@/hooks/indexerQueries";
import { useFstrBalance } from "@/hooks/rewardsQueries";
import { fetchCampaignFromChain, CampaignInfo } from "@/hooks/campaignQueries";
import { useCurrentPrices } from "@/lib/currency-utils";
import { isMainnetEnvironment } from "@/lib/contract-utils";
import { StatusBadge, getCampaignStatus } from "@/components/common/StatusBadge";
import { CombinedAmountDisplay } from "@/components/common/AmountDisplay";
import { SimpleAddress } from "@/components/common/AddressDisplay";
import { WalletIdenticon } from "@/components/common/WalletIdenticon";
import { hasClaimed } from "@/lib/fundstacks-rewards-reads";
import {
  getBadgeMetadata,
  getDonorBadgeId,
  getDonorContributionStxEquivalent,
  tierForAmount,
  TIER_NONE,
} from "@/lib/donor-badges-reads";

type DashboardPanel = "overview" | "campaigns" | "donations" | "settings";
type CampaignFilter = "active" | "ended" | "all";

const NAV_ITEMS: Array<{ id: DashboardPanel; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "campaigns", label: "My Campaigns" },
  { id: "donations", label: "My Donations" },
  { id: "settings", label: "Settings" },
];

const PANEL_COPY: Record<DashboardPanel, { title: string; sub: string }> = {
  overview: { title: "Welcome back", sub: "Everything happening with your wallet, in one place." },
  campaigns: { title: "My Campaigns", sub: "Manage the campaigns you've created." },
  donations: { title: "My Donations", sub: "Track your contributions, rewards, and badges." },
  settings: { title: "Settings", sub: "Account and dashboard preferences." },
};

const CARD = {
  bg: "bg.surface",
  borderColor: "border.default",
  borderWidth: "1px",
  borderRadius: "2xl",
  boxShadow: "0 1px 2px rgba(15,23,43,0.04)",
} as const;

function parseRawAmount(value: number | string): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

const usd = (n: number) =>
  `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function MicroLabel({ children, color = "text.tertiary" }: { children: ReactNode; color?: string }) {
  return (
    <Text fontSize="11px" fontWeight="700" letterSpacing="0.08em" textTransform="uppercase" color={color}>
      {children}
    </Text>
  );
}

function Tile({ children, ...rest }: { children: ReactNode } & Record<string, unknown>) {
  return (
    <Box {...CARD} p={5} {...rest}>
      {children}
    </Box>
  );
}

function StatTile({
  label,
  value,
  sub,
  valueColor = "text.primary",
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  valueColor?: string;
}) {
  return (
    <Tile p={4} h="100%">
      <MicroLabel>{label}</MicroLabel>
      <Text fontSize="2xl" fontWeight="800" color={valueColor} lineHeight="1.1" mt={1}>
        {value}
      </Text>
      {sub && (
        <Text fontSize="xs" color="text.tertiary" mt={1} noOfLines={1}>
          {sub}
        </Text>
      )}
    </Tile>
  );
}

export default function DashboardPage() {
  const [activePanel, setActivePanel] = useState<DashboardPanel>("overview");
  const [campaignFilter, setCampaignFilter] = useState<CampaignFilter>("active");
  const { isOpen, onOpen, onClose } = useDisclosure();

  const address = useAddress();
  const { data: prices } = useCurrentPrices();
  const { data: myCampaigns, isLoading: campaignsLoading } = useMyCampaigns(address);
  const { data: myDonations, isLoading: donationsLoading } = useMyDonations(address);
  const { data: uniqueSupporters } = useMyUniqueSupporters(address);
  const { data: fstrBalance } = useFstrBalance(address);

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

  const supportedCampaignIds = useMemo(
    () => Array.from(new Set(donations.map((d) => d.campaign_id))),
    [donations]
  );

  const { data: donorEngagement } = useQuery<{
    claimableRewardsCount: number;
    badgesOwnedCount: number;
    claimableBadgesCount: number;
    upgradableBadgesCount: number;
    claimableRewardCampaignIds: number[];
    claimableBadgeCampaignIds: number[];
    upgradableBadgeCampaignIds: number[];
  }>({
    queryKey: ["dashboard", "donor-engagement", address, supportedCampaignIds],
    queryFn: async () => {
      if (!address || supportedCampaignIds.length === 0) {
        return {
          claimableRewardsCount: 0,
          badgesOwnedCount: 0,
          claimableBadgesCount: 0,
          upgradableBadgesCount: 0,
          claimableRewardCampaignIds: [],
          claimableBadgeCampaignIds: [],
          upgradableBadgeCampaignIds: [],
        };
      }

      const rows = await Promise.all(
        supportedCampaignIds.map(async (campaignId) => {
          const [claimedRewards, badgeId, stxEq] = await Promise.all([
            hasClaimed(campaignId, address),
            getDonorBadgeId(campaignId, address),
            getDonorContributionStxEquivalent(campaignId, address),
          ]);

          const previewTier = tierForAmount(stxEq ?? BigInt(0));
          let upgradable = false;
          if (badgeId !== null) {
            const md = await getBadgeMetadata(badgeId);
            if (md && previewTier > md.tier) upgradable = true;
          }

          return {
            claimedRewards,
            badgeOwned: badgeId !== null,
            claimableBadge: badgeId === null && previewTier > TIER_NONE,
            upgradable,
          };
        })
      );

      return {
        claimableRewardsCount: rows.filter((r) => !r.claimedRewards).length,
        badgesOwnedCount: rows.filter((r) => r.badgeOwned).length,
        claimableBadgesCount: rows.filter((r) => r.claimableBadge).length,
        upgradableBadgesCount: rows.filter((r) => r.upgradable).length,
        claimableRewardCampaignIds: supportedCampaignIds.filter(
          (_id, idx) => !rows[idx].claimedRewards
        ),
        claimableBadgeCampaignIds: supportedCampaignIds.filter(
          (_id, idx) => rows[idx].claimableBadge
        ),
        upgradableBadgeCampaignIds: supportedCampaignIds.filter(
          (_id, idx) => rows[idx].upgradable
        ),
      };
    },
    enabled: !!address,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const filteredCampaigns = useMemo(() => {
    if (campaignFilter === "all") return campaignsWithStatus;
    if (campaignFilter === "active") {
      return campaignsWithStatus.filter((campaign) => campaign.status === "active");
    }
    return campaignsWithStatus.filter(
      (campaign) => campaign.status === "ended" || campaign.status === "cancelled"
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

  const totalDonatedUsd = useMemo(() => {
    return donations.reduce((sum, donation) => {
      const raw = parseRawAmount(donation.amount);
      if (donation.event_name === "donated-stx") {
        return sum + (raw / 1_000_000) * (prices?.stx || 0);
      }
      if (donation.event_name === "donated-sbtc") {
        return sum + (raw / 100_000_000) * (prices?.sbtc || 0);
      }
      return sum;
    }, 0);
  }, [donations, prices]);

  const activeCount = useMemo(
    () => campaignsWithStatus.filter((c) => c.status === "active").length,
    [campaignsWithStatus]
  );

  const fstrDisplay =
    fstrBalance !== null && fstrBalance !== undefined
      ? (Number(fstrBalance) / 1_000_000).toLocaleString(undefined, { maximumFractionDigits: 2 })
      : "0";

  // Prioritized actions across both roles (withdraw / claim rewards / claim or upgrade badge).
  const actionItems = useMemo(() => {
    const items: Array<{ key: string; label: string; detail: string; href: string; cta: string; scheme: string }> = [];
    endedAwaitingWithdrawal.forEach((c) =>
      items.push({ key: `w-${c.campaign_id}`, label: "Withdraw available", detail: `Campaign #${c.campaign_id}`, href: `/campaigns/${c.campaign_id}`, cta: "Open", scheme: "primary" })
    );
    (donorEngagement?.claimableRewardCampaignIds ?? []).forEach((id) =>
      items.push({ key: `r-${id}`, label: "Claim FSTR rewards", detail: `Campaign #${id}`, href: `/campaigns/${id}`, cta: "Claim", scheme: "green" })
    );
    (donorEngagement?.claimableBadgeCampaignIds ?? []).forEach((id) =>
      items.push({ key: `b-${id}`, label: "Claim donor badge", detail: `Campaign #${id}`, href: `/campaigns/${id}`, cta: "Claim", scheme: "blue" })
    );
    (donorEngagement?.upgradableBadgeCampaignIds ?? []).forEach((id) =>
      items.push({ key: `u-${id}`, label: "Upgrade badge tier", detail: `Campaign #${id}`, href: `/campaigns/${id}`, cta: "Upgrade", scheme: "orange" })
    );
    return items;
  }, [endedAwaitingWithdrawal, donorEngagement]);

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
              Connect your wallet to see your campaigns, donations, and activity in one place.
            </Text>
            <Text fontSize="sm" color="text.tertiary" maxW="md">
              You stay in control — every action is approved in your wallet, and
              we never touch your funds.
            </Text>
          </VStack>
          <ConnectWallet size="lg" w={{ base: "full", sm: "auto" }} maxW="sm" />
        </VStack>
      </Box>
    );
  }

  const go = (panel: DashboardPanel) => {
    setActivePanel(panel);
    onClose();
  };

  const navList = (
    <VStack align="stretch" spacing={1}>
      {NAV_ITEMS.map((item) => {
        const isActive = activePanel === item.id;
        return (
          <Button
            key={item.id}
            variant="ghost"
            justifyContent="flex-start"
            borderRadius="lg"
            h="40px"
            px={3}
            bg={isActive ? "bg.accentSubtle" : "transparent"}
            color={isActive ? "primary.700" : "text.secondary"}
            fontWeight={isActive ? "700" : "500"}
            _hover={{ bg: isActive ? "bg.accentSubtle" : "bg.surfaceAlt" }}
            onClick={() => go(item.id)}
          >
            {item.label}
          </Button>
        );
      })}
      <Divider my={1.5} />
      <Button
        as={Link}
        href="/campaigns"
        variant="ghost"
        justifyContent="flex-start"
        borderRadius="lg"
        h="40px"
        px={3}
        color="text.secondary"
        fontWeight="500"
        _hover={{ bg: "bg.surfaceAlt" }}
      >
        Browse Campaigns
      </Button>
    </VStack>
  );

  const addressChip = (
    <HStack
      spacing={2}
      w="fit-content"
      maxW="full"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="full"
      px={2}
      py={1}
      bg="bg.surface"
    >
      <WalletIdenticon address={address} size={20} />
      <SimpleAddress address={address} length={4} fontSize="xs" />
    </HStack>
  );

  const copy = PANEL_COPY[activePanel];

  return (
    <Box maxW="container.xl" mx="auto" py={{ base: 5, md: 8 }} px={{ base: 4, md: 8 }}>
      {/* Mobile top bar */}
      <HStack display={{ base: "flex", lg: "none" }} justify="space-between" mb={4}>
        <IconButton
          aria-label="Open menu"
          icon={<HamburgerIcon />}
          variant="outline"
          borderRadius="full"
          onClick={onOpen}
        />
        {addressChip}
      </HStack>

      <Grid templateColumns={{ base: "1fr", lg: "240px 1fr" }} gap={{ base: 5, lg: 8 }}>
        {/* Sticky sidebar (desktop) */}
        <GridItem display={{ base: "none", lg: "block" }}>
          <Box {...CARD} p={3} position="sticky" top="24px">
            <Box px={1} pb={3}>{addressChip}</Box>
            <Divider mb={2} />
            {navList}
          </Box>
        </GridItem>

        <GridItem minW={0}>
          {/* Greeting / header */}
          <HStack justify="space-between" align="start" mb={6} flexWrap="wrap" gap={4}>
            <Box>
              <Heading size="lg">{copy.title}</Heading>
              <Text fontSize="sm" color="text.secondary" mt={1}>
                {copy.sub}
              </Text>
            </Box>
            <Button
              as={Link}
              href="/campaigns/new"
              leftIcon={<AddIcon />}
              colorScheme="primary"
              borderRadius="full"
              fontWeight="700"
            >
              Create Campaign
            </Button>
          </HStack>

          {activePanel === "overview" && (
            <Grid templateColumns={{ base: "repeat(2, 1fr)", xl: "repeat(4, 1fr)" }} gap={4} autoRows="min-content">
              {/* Hero — dual peer: Raised | Donated */}
              <GridItem gridColumn={{ base: "1 / -1", xl: "span 2" }}>
                <Tile bg="bg.accentSubtle" borderColor="border.accent" h="100%" minH="170px" display="flex" alignItems="center">
                  <Stack
                    direction={{ base: "column", sm: "row" }}
                    divider={<StackDivider borderColor="border.accent" />}
                    spacing={5}
                    w="100%"
                  >
                    <Box flex={1} minW={0}>
                      <MicroLabel color="primary.700">Raised</MicroLabel>
                      <Text fontSize="3xl" fontWeight="800" color="primary.700" lineHeight="1.1" mt={1}>
                        {usd(lifetimeRaisedUsd)}
                      </Text>
                      {campaigns.length > 0 ? (
                        <Text fontSize="xs" color="text.secondary" mt={1}>
                          {campaigns.length} campaign{campaigns.length === 1 ? "" : "s"} · {usd(currentlyHeldUsd)} held
                        </Text>
                      ) : (
                        <ChakraLink as={Link} href="/campaigns/new" fontSize="xs" color="primary.600" fontWeight="600" mt={1} display="inline-block">
                          Start your first campaign →
                        </ChakraLink>
                      )}
                    </Box>
                    <Box flex={1} minW={0}>
                      <MicroLabel color="secondary.700">Donated</MicroLabel>
                      <Text fontSize="3xl" fontWeight="800" color="secondary.700" lineHeight="1.1" mt={1}>
                        {usd(totalDonatedUsd)}
                      </Text>
                      {supportedCampaignIds.length > 0 ? (
                        <Text fontSize="xs" color="text.secondary" mt={1}>
                          {supportedCampaignIds.length} campaign{supportedCampaignIds.length === 1 ? "" : "s"} backed
                        </Text>
                      ) : (
                        <ChakraLink as={Link} href="/campaigns" fontSize="xs" color="secondary.600" fontWeight="600" mt={1} display="inline-block">
                          Back a campaign →
                        </ChakraLink>
                      )}
                    </Box>
                  </Stack>
                </Tile>
              </GridItem>

              {/* Action Queue */}
              <GridItem gridColumn={{ base: "1 / -1", xl: "span 2" }}>
                <Tile h="100%" minH="170px">
                  <HStack justify="space-between" mb={1}>
                    <Heading size="sm">Action Queue</Heading>
                    {actionItems.length > 0 && (
                      <Badge colorScheme="primary" borderRadius="full" px={2}>
                        {actionItems.length}
                      </Badge>
                    )}
                  </HStack>
                  {actionItems.length === 0 ? (
                    <VStack spacing={1} py={5} color="text.tertiary">
                      <Text fontSize="sm" fontWeight="600" color="text.secondary">
                        You&apos;re all caught up
                      </Text>
                      <Text fontSize="xs">No pending withdrawals, rewards, or badges.</Text>
                    </VStack>
                  ) : (
                    <VStack align="stretch" spacing={2} mt={2}>
                      {actionItems.slice(0, 4).map((a) => (
                        <HStack key={a.key} justify="space-between" gap={2} flexWrap="wrap">
                          <Box minW={0}>
                            <Text fontSize="sm" fontWeight="600" color="text.primary" noOfLines={1}>
                              {a.label}
                            </Text>
                            <Text fontSize="xs" color="text.tertiary">
                              {a.detail}
                            </Text>
                          </Box>
                          <Button
                            as={Link}
                            href={a.href}
                            size="xs"
                            colorScheme={a.scheme}
                            variant="outline"
                            borderRadius="full"
                            fontWeight="700"
                          >
                            {a.cta}
                          </Button>
                        </HStack>
                      ))}
                      {actionItems.length > 4 && (
                        <Text fontSize="xs" color="text.tertiary">
                          +{actionItems.length - 4} more
                        </Text>
                      )}
                    </VStack>
                  )}
                </Tile>
              </GridItem>

              {/* KPI tiles */}
              <StatTile label="Currently Held" value={usd(currentlyHeldUsd)} sub="In active / cancelled contracts" valueColor="primary.600" />
              <StatTile label="Campaigns" value={campaigns.length} sub={`${activeCount} active`} />
              <StatTile label="Supporters" value={uniqueSupporters ?? donorAppearances} sub="Unique wallets" valueColor="secondary.600" />
              <StatTile label="Backed" value={supportedCampaignIds.length} sub="Campaigns you support" />

              {/* Your campaigns preview */}
              <GridItem gridColumn={{ base: "1 / -1", xl: "span 2" }}>
                <Tile h="100%">
                  <HStack justify="space-between" mb={3}>
                    <Heading size="sm">Your Campaigns</Heading>
                    {campaigns.length > 0 && (
                      <Button variant="link" size="sm" colorScheme="primary" onClick={() => setActivePanel("campaigns")}>
                        View all
                      </Button>
                    )}
                  </HStack>
                  {campaignsLoading ? (
                    <VStack align="stretch" spacing={2}>
                      {[1, 2, 3].map((i) => <Skeleton key={i} height="44px" borderRadius="lg" />)}
                    </VStack>
                  ) : campaignsWithStatus.length === 0 ? (
                    <VStack spacing={2} py={4} align="center">
                      <Text fontSize="sm" color="text.secondary">No campaigns yet.</Text>
                      <Button as={Link} href="/campaigns/new" size="sm" colorScheme="primary" borderRadius="full" fontWeight="700" leftIcon={<AddIcon />}>
                        Create one
                      </Button>
                    </VStack>
                  ) : (
                    <VStack align="stretch" spacing={2}>
                      {campaignsWithStatus.slice(0, 3).map((c) => (
                        <HStack
                          key={c.campaign_id}
                          as={Link}
                          href={`/campaigns/${c.campaign_id}`}
                          justify="space-between"
                          p={2.5}
                          borderRadius="lg"
                          bg="bg.surfaceAlt"
                          _hover={{ bg: "bg.accentSubtle" }}
                          gap={3}
                          minW={0}
                        >
                          <Box minW={0}>
                            <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                              {c.title || `Campaign #${c.campaign_id}`}
                            </Text>
                            <StatusBadge status={c.status} size="sm" />
                          </Box>
                          <CombinedAmountDisplay
                            stxAmount={c.total_stx}
                            sbtcAmount={c.total_sbtc}
                            stxPrice={prices?.stx}
                            sbtcPrice={prices?.sbtc}
                            size="sm"
                          />
                        </HStack>
                      ))}
                    </VStack>
                  )}
                </Tile>
              </GridItem>

              {/* Recent donations preview */}
              <GridItem gridColumn={{ base: "1 / -1", xl: "span 2" }}>
                <Tile h="100%">
                  <HStack justify="space-between" mb={3}>
                    <Heading size="sm">Recent Donations</Heading>
                    {donations.length > 0 && (
                      <Button variant="link" size="sm" colorScheme="primary" onClick={() => setActivePanel("donations")}>
                        View all
                      </Button>
                    )}
                  </HStack>
                  {donationsLoading ? (
                    <VStack align="stretch" spacing={2}>
                      {[1, 2, 3].map((i) => <Skeleton key={i} height="44px" borderRadius="lg" />)}
                    </VStack>
                  ) : donations.length === 0 ? (
                    <VStack spacing={2} py={4} align="center">
                      <Text fontSize="sm" color="text.secondary">No donations yet.</Text>
                      <Button as={Link} href="/campaigns" size="sm" colorScheme="primary" borderRadius="full" fontWeight="700">
                        Browse campaigns
                      </Button>
                    </VStack>
                  ) : (
                    <VStack align="stretch" spacing={2}>
                      {donations.slice(0, 3).map((d, i) => {
                        const isStx = d.event_name === "donated-stx";
                        return (
                          <HStack
                            key={`${d.txid}-${i}`}
                            as={Link}
                            href={`/campaigns/${d.campaign_id}`}
                            justify="space-between"
                            p={2.5}
                            borderRadius="lg"
                            bg="bg.surfaceAlt"
                            _hover={{ bg: "bg.accentSubtle" }}
                            gap={3}
                            minW={0}
                          >
                            <Box minW={0}>
                              <Text fontSize="sm" fontWeight="600" noOfLines={1}>
                                Campaign #{d.campaign_id}
                              </Text>
                              <Text fontSize="xs" color="text.tertiary">
                                {new Date(d.inserted_at).toLocaleDateString()}
                              </Text>
                            </Box>
                            <CombinedAmountDisplay
                              stxAmount={isStx ? d.amount : "0"}
                              sbtcAmount={!isStx ? d.amount : "0"}
                              stxPrice={prices?.stx}
                              sbtcPrice={prices?.sbtc}
                              size="sm"
                            />
                          </HStack>
                        );
                      })}
                    </VStack>
                  )}
                </Tile>
              </GridItem>

              {/* Rewards & badges */}
              <GridItem gridColumn="1 / -1">
                <Tile>
                  <HStack justify="space-between" mb={3} flexWrap="wrap" gap={2}>
                    <Heading size="sm">Rewards &amp; Badges</Heading>
                    {((donorEngagement?.claimableBadgesCount ?? 0) > 0 ||
                      (donorEngagement?.claimableRewardsCount ?? 0) > 0) && (
                      <Button variant="link" size="sm" colorScheme="primary" onClick={() => setActivePanel("donations")}>
                        View claims
                      </Button>
                    )}
                  </HStack>
                  <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                    <Box>
                      <MicroLabel>FSTR Balance</MicroLabel>
                      <Text fontSize="xl" fontWeight="800" color="secondary.600" mt={1}>{fstrDisplay}</Text>
                    </Box>
                    <Box>
                      <MicroLabel>Badges Owned</MicroLabel>
                      <Text fontSize="xl" fontWeight="800" mt={1}>{donorEngagement?.badgesOwnedCount ?? 0}</Text>
                    </Box>
                    <Box>
                      <MicroLabel>Claimable</MicroLabel>
                      <Text fontSize="xl" fontWeight="800" color="primary.600" mt={1}>{donorEngagement?.claimableBadgesCount ?? 0}</Text>
                    </Box>
                    <Box>
                      <MicroLabel>Upgradable</MicroLabel>
                      <Text fontSize="xl" fontWeight="800" color="warning.600" mt={1}>{donorEngagement?.upgradableBadgesCount ?? 0}</Text>
                    </Box>
                  </SimpleGrid>
                </Tile>
              </GridItem>
            </Grid>
          )}

          {activePanel === "campaigns" && (
            <>
              <HStack spacing={2} mb={4} flexWrap="wrap">
                {(
                  [
                    { id: "active", label: "Active", count: activeCount },
                    { id: "ended", label: "Ended", count: campaignsWithStatus.filter((c) => c.status !== "active").length },
                    { id: "all", label: "All", count: campaignsWithStatus.length },
                  ] as Array<{ id: CampaignFilter; label: string; count: number }>
                ).map((tab) => {
                  const selected = campaignFilter === tab.id;
                  return (
                    <Button
                      key={tab.id}
                      size="sm"
                      variant={selected ? "solid" : "outline"}
                      colorScheme="primary"
                      borderRadius="full"
                      fontWeight="700"
                      borderColor={selected ? "primary.500" : "border.default"}
                      color={selected ? undefined : "text.secondary"}
                      onClick={() => setCampaignFilter(tab.id)}
                    >
                      {tab.label}
                      <Badge ml={2} colorScheme={selected ? "whiteAlpha" : "gray"} borderRadius="full">
                        {tab.count}
                      </Badge>
                    </Button>
                  );
                })}
              </HStack>

              {campaignsLoading ? (
                <VStack align="stretch" spacing={3}>
                  {[1, 2, 3].map((i) => <Skeleton key={i} height="84px" borderRadius="2xl" />)}
                </VStack>
              ) : filteredCampaigns.length === 0 ? (
                <Tile bg="bg.surfaceAlt" py={10}>
                  <VStack spacing={2} textAlign="center">
                    <Heading size="md">No campaigns here</Heading>
                    <Text color="text.secondary" fontSize="sm">Try another filter or create a new campaign.</Text>
                  </VStack>
                </Tile>
              ) : (
                <VStack align="stretch" spacing={3}>
                  {filteredCampaigns.map((campaign) => (
                    <Box
                      key={campaign.campaign_id}
                      as={Link}
                      href={`/campaigns/${campaign.campaign_id}`}
                      {...CARD}
                      p={4}
                      _hover={{ borderColor: "border.accent", boxShadow: "sm" }}
                    >
                      <HStack justify="space-between" align="center" gap={4} flexWrap="wrap">
                        <VStack align="start" spacing={1} minW={0}>
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
                    </Box>
                  ))}
                </VStack>
              )}
            </>
          )}

          {activePanel === "donations" && (
            <>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mb={4}>
                <StatTile label="Total Donated" value={usd(totalDonatedUsd)} sub="Lifetime by this wallet" valueColor="primary.600" />
                <StatTile label="Campaigns Supported" value={supportedCampaignIds.length} sub="Distinct campaigns" />
                <StatTile label="FSTR Balance" value={fstrDisplay} sub="Rewards token in wallet" valueColor="secondary.600" />
                <StatTile label="Badges Owned" value={donorEngagement?.badgesOwnedCount ?? 0} sub="Across supported campaigns" />
              </SimpleGrid>

              {donationsLoading ? (
                <VStack spacing={3} align="stretch">
                  {[1, 2, 3].map((i) => <Skeleton key={i} height="64px" borderRadius="2xl" />)}
                </VStack>
              ) : donations.length === 0 ? (
                <Tile bg="bg.surfaceAlt" py={12}>
                  <VStack spacing={3} textAlign="center">
                    <Heading size="md">No donations yet</Heading>
                    <Text color="text.secondary" fontSize="sm" maxW="320px">
                      Find a cause you believe in and chip in — your support
                      shows up here.
                    </Text>
                    <Button as={Link} href="/campaigns" colorScheme="primary" borderRadius="full" fontWeight="700">
                      Browse campaigns
                    </Button>
                  </VStack>
                </Tile>
              ) : (
                <Tile p={0}>
                  <VStack spacing={0} align="stretch" divider={<Divider borderColor="border.subtle" />}>
                    {donations.map((donation, index) => {
                      const isStx = donation.event_name === "donated-stx";
                      const explorerUrl = donation.txid
                        ? `https://explorer.stacks.co/txid/${donation.txid}`
                        : null;
                      return (
                        <HStack key={`${donation.txid}-${index}`} px={4} py={3} justify="space-between" flexWrap="wrap" gap={2}>
                          <VStack align="start" spacing={0}>
                            <ChakraLink
                              as={Link}
                              href={`/campaigns/${donation.campaign_id}`}
                              fontWeight="600"
                              fontSize="sm"
                              color="text.primary"
                              _hover={{ color: "primary.600" }}
                            >
                              Campaign #{donation.campaign_id}
                            </ChakraLink>
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
                </Tile>
              )}
            </>
          )}

          {activePanel === "settings" && (
            <VStack align="stretch" spacing={4}>
              <Tile>
                <MicroLabel>Connected wallet</MicroLabel>
                <HStack mt={2} justify="space-between" flexWrap="wrap" gap={3}>
                  <HStack spacing={3} minW={0}>
                    <WalletIdenticon address={address} size={36} />
                    <SimpleAddress address={address} length={6} fontSize="sm" />
                  </HStack>
                  {isMainnetEnvironment() && (
                    <Badge variant="active" fontSize="xs">Stacks mainnet</Badge>
                  )}
                </HStack>
              </Tile>
              <Tile bg="bg.surfaceAlt" py={10}>
                <VStack spacing={2} textAlign="center">
                  <Heading size="md">More settings coming soon</Heading>
                  <Text color="text.secondary" fontSize="sm">
                    Notification and dashboard preferences will appear here.
                  </Text>
                </VStack>
              </Tile>
            </VStack>
          )}
        </GridItem>
      </Grid>

      {/* Mobile nav drawer */}
      <Drawer isOpen={isOpen} placement="left" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerBody pt={14} pb={4}>{navList}</DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
}
