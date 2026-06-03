"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Skeleton,
  SkeletonCircle,
  Link,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import { format } from "timeago.js";
import { SimpleAddress } from "../common/AddressDisplay";
import { AmountDisplay } from "../common/AmountDisplay";
import { WalletIdenticon } from "../common/WalletIdenticon";
import type { CampaignEvent, ActivityEvent } from "@/hooks/indexerQueries";

// ── Event config ──────────────────────────────────────────────────────────────

function getEventConfig(eventName: string): { label: string; color: string } {
  switch (eventName) {
    case "campaign-created":
      return { label: "Created", color: "primary.500" };
    case "donated-stx":
      return { label: "Donated STX", color: "secondary.500" };
    case "donated-sbtc":
      return { label: "Donated sBTC", color: "warning.500" };
    case "campaign-cancelled":
      return { label: "Cancelled", color: "error.500" };
    case "campaign-withdrawn":
      return { label: "Withdrawn", color: "success.500" };
    case "refunded":
      return { label: "Refunded", color: "text.secondary" };
    default:
      return { label: eventName, color: "text.secondary" };
  }
}

function getEventActor(
  eventName: string,
  donor?: string | null,
  owner?: string | null,
  beneficiary?: string | null
): string | null {
  if (eventName.startsWith("donated-") || eventName === "refunded") return donor || null;
  if (eventName === "campaign-created" || eventName === "campaign-cancelled") return owner || null;
  if (eventName === "campaign-withdrawn") return beneficiary || null;
  return donor || owner || beneficiary || null;
}

function getTxExplorerUrl(txid: string): string {
  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK || "mainnet";
  const suffix = network === "testnet" ? "?chain=testnet" : "";
  return `https://explorer.stacks.co/txid/${txid}${suffix}`;
}

// ── Timeline node: identicon (or colored dot) ringed in the event color ───────

function RailNode({
  color,
  actor,
  isLast,
}: {
  color: string;
  actor: string | null;
  isLast: boolean;
}) {
  return (
    <VStack spacing={0} align="center" flexShrink={0}>
      <Box
        borderRadius="full"
        borderWidth="2px"
        borderColor={color}
        bg="bg.surface"
        p="2px"
        lineHeight="0"
      >
        {actor ? (
          <WalletIdenticon address={actor} size={24} />
        ) : (
          <Box
            w="24px"
            h="24px"
            borderRadius="full"
            bg={color}
            opacity={0.25}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Box w="8px" h="8px" borderRadius="full" bg={color} />
          </Box>
        )}
      </Box>
      {!isLast && <Box flex="1" w="2px" minH="20px" my="6px" bg="border.subtle" />}
    </VStack>
  );
}

// ── Single item ───────────────────────────────────────────────────────────────

interface ActivityFeedItemProps {
  eventName: string;
  donor?: string | null;
  owner?: string | null;
  beneficiary?: string | null;
  amount?: string | null;
  txid?: string | null;
  insertedAt: string;
  campaignId?: number | null;
  showCampaignLink?: boolean;
  stxPrice?: number;
  sbtcPrice?: number;
  isLast?: boolean;
}

export function ActivityFeedItem({
  eventName,
  donor,
  owner,
  beneficiary,
  amount,
  txid,
  insertedAt,
  campaignId,
  showCampaignLink = false,
  stxPrice,
  sbtcPrice,
  isLast = false,
}: ActivityFeedItemProps) {
  const config = getEventConfig(eventName);
  const actor = getEventActor(eventName, donor, owner, beneficiary);
  const isDonation = eventName.startsWith("donated-");
  const token =
    eventName === "donated-stx" ? "stx" : eventName === "donated-sbtc" ? "sbtc" : null;

  return (
    <HStack align="stretch" spacing={3} minW={0}>
      <RailNode color={config.color} actor={actor} isLast={isLast} />

      <Box flex={1} minW={0} pb={isLast ? 0 : 5} pt="5px">
        <HStack justify="space-between" align="flex-start" gap={3} minW={0}>
          {/* Label + actor */}
          <HStack spacing={2} flexWrap="wrap" minW={0}>
            <Text fontSize="sm" fontWeight="600" color={config.color} flexShrink={0}>
              {config.label}
            </Text>
            {actor && <SimpleAddress address={actor} length={4} fontSize="sm" />}
            {showCampaignLink && campaignId && (
              <Link
                href={`/campaigns/${campaignId}`}
                color="secondary.600"
                fontSize="sm"
                flexShrink={0}
              >
                Campaign #{campaignId}
              </Link>
            )}
          </HStack>

          {/* Timestamp + tx link */}
          <HStack spacing={2} flexShrink={0}>
            <Text fontSize="xs" color="text.tertiary" whiteSpace="nowrap">
              {format(insertedAt)}
            </Text>
            {txid && (
              <Link
                href={getTxExplorerUrl(txid)}
                isExternal
                fontSize="xs"
                color="primary.500"
                _hover={{ color: "primary.700" }}
                whiteSpace="nowrap"
                aria-label="View transaction"
              >
                ↗
              </Link>
            )}
          </HStack>
        </HStack>

        {/* Donation amount on its own line */}
        {isDonation && amount && token && (
          <Box mt={1}>
            <AmountDisplay
              amount={amount}
              token={token}
              usdPrice={token === "stx" ? stxPrice : sbtcPrice}
              showUsd={!!(stxPrice || sbtcPrice)}
              size="sm"
            />
          </Box>
        )}
      </Box>
    </HStack>
  );
}

// ── Grouping helpers ──────────────────────────────────────────────────────────

interface GroupedByDay {
  dayKey: string;
  dayLabel: string;
  events: (CampaignEvent | ActivityEvent)[];
}

function getDayKey(insertedAt: string): string {
  return new Date(insertedAt).toISOString().slice(0, 10);
}

function getDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(year, month - 1, day));
}

function groupByDay(
  events: (CampaignEvent | ActivityEvent)[]
): GroupedByDay[] {
  const map = new Map<string, (CampaignEvent | ActivityEvent)[]>();
  events.forEach((e) => {
    const key = getDayKey(e.inserted_at);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(e);
  });
  return Array.from(map.entries()).map(([dayKey, dayEvents]) => ({
    dayKey,
    dayLabel: getDayLabel(dayKey),
    events: dayEvents,
  }));
}

// ── Feed list ─────────────────────────────────────────────────────────────────

interface ActivityFeedProps {
  events: CampaignEvent[] | ActivityEvent[];
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  ariaLabel?: string;
  showCampaignLinks?: boolean;
  stxPrice?: number;
  sbtcPrice?: number;
  emptyMessage?: string;
}

export function ActivityFeed({
  events,
  isLoading = false,
  isError = false,
  errorMessage = "The indexer could not be reached. Check your connection and try again.",
  onRetry,
  isRetrying = false,
  ariaLabel = "Campaign activity feed",
  showCampaignLinks = false,
  stxPrice,
  sbtcPrice,
  emptyMessage = "No activity yet",
}: ActivityFeedProps) {
  if (isLoading) {
    return (
      <Box role="region" aria-label={ariaLabel}>
        <VStack spacing={5} align="stretch">
          {[1, 2, 3].map((i) => (
            <HStack key={i} spacing={3} align="center">
              <SkeletonCircle size="8" />
              <Skeleton height="14px" flex={1} />
              <Skeleton height="12px" width="48px" />
            </HStack>
          ))}
        </VStack>
      </Box>
    );
  }

  if (isError) {
    return (
      <Box role="region" aria-label={ariaLabel}>
        <Alert
          status="error"
          borderRadius="lg"
          alignItems={{ base: "flex-start", md: "center" }}
          flexDirection={{ base: "column", md: "row" }}
          gap={{ base: 3, md: 2 }}
        >
          <AlertIcon mt={{ base: "2px", md: 0 }} />
          <Box flex="1">
            <AlertTitle fontSize="sm">Unable to load activity.</AlertTitle>
            <AlertDescription fontSize="sm" color="text.secondary">
              {errorMessage}
            </AlertDescription>
          </Box>
          {onRetry && (
            <Button
              size="sm"
              variant="outline"
              colorScheme="primary"
              borderRadius="full"
              fontWeight="700"
              onClick={onRetry}
              isLoading={isRetrying}
            >
              Retry
            </Button>
          )}
        </Alert>
      </Box>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Box role="region" aria-label={ariaLabel}>
        <Box
          py={8}
          textAlign="center"
          bg="bg.surfaceAlt"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="border.default"
        >
          <Text color="text.secondary" fontSize="sm">
            {emptyMessage}
          </Text>
        </Box>
      </Box>
    );
  }

  const grouped = groupByDay(events);

  return (
    <Box role="region" aria-label={ariaLabel}>
      <VStack spacing={5} align="stretch">
        {grouped.map((dayGroup) => (
          <Box key={dayGroup.dayKey}>
            <Text
              fontSize="xs"
              fontWeight="700"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="0.08em"
              mb={3}
            >
              {dayGroup.dayLabel}
            </Text>

            <VStack spacing={0} align="stretch">
              {dayGroup.events.map((event, index) => {
                const campaignId =
                  "campaign_id" in event ? event.campaign_id : undefined;
                return (
                  <ActivityFeedItem
                    key={event.txid || `${dayGroup.dayKey}-${index}`}
                    eventName={event.event_name}
                    donor={event.donor}
                    owner={event.owner}
                    beneficiary={event.beneficiary}
                    amount={event.amount}
                    txid={event.txid}
                    insertedAt={event.inserted_at}
                    campaignId={campaignId}
                    showCampaignLink={showCampaignLinks}
                    stxPrice={stxPrice}
                    sbtcPrice={sbtcPrice}
                    isLast={index === dayGroup.events.length - 1}
                  />
                );
              })}
            </VStack>
          </Box>
        ))}
      </VStack>
    </Box>
  );
}

export default ActivityFeed;
