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
  Divider,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import { format } from "timeago.js";
import { SimpleAddress } from "../common/AddressDisplay";
import { AmountDisplay } from "../common/AmountDisplay";
import type { CampaignEvent, ActivityEvent } from "@/hooks/indexerQueries";

// ── Event config ──────────────────────────────────────────────────────────────

function getEventConfig(eventName: string): {
  label: string;
  color: string;
  icon: string;
} {
  switch (eventName) {
    case "campaign-created":
      return { label: "Created", color: "primary.500", icon: "🎉" };
    case "donated-stx":
      return { label: "Donated STX", color: "secondary.500", icon: "" };
    case "donated-sbtc":
      return { label: "Donated sBTC", color: "warning.500", icon: "" };
    case "campaign-cancelled":
      return { label: "Cancelled", color: "error.500", icon: "✕" };
    case "campaign-withdrawn":
      return { label: "Withdrawn", color: "success.500", icon: "✓" };
    case "refunded":
      return { label: "Refunded", color: "text.secondary", icon: "↩" };
    default:
      return { label: eventName, color: "text.secondary", icon: "·" };
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
}: ActivityFeedItemProps) {
  const config = getEventConfig(eventName);
  const actor = getEventActor(eventName, donor, owner, beneficiary);
  const isDonation = eventName.startsWith("donated-");
  const token =
    eventName === "donated-stx" ? "stx" : eventName === "donated-sbtc" ? "sbtc" : null;

  return (
    <HStack spacing={3} py={2.5} align="center" minW={0}>
      {/* Indicator: dot for donations, text symbol for lifecycle events */}
      {isDonation ? (
        <Box
          w="8px"
          h="8px"
          borderRadius="full"
          bg={config.color}
          flexShrink={0}
        />
      ) : (
        <Text
          fontSize="xs"
          color={config.color}
          fontWeight="700"
          flexShrink={0}
          w="8px"
          textAlign="center"
        >
          {config.icon}
        </Text>
      )}

      {/* Main content */}
      <HStack spacing={2} flex={1} minW={0} flexWrap="wrap">
        {!isDonation && (
          <Text
            fontSize="sm"
            fontWeight="600"
            color={config.color}
            flexShrink={0}
          >
            {config.label}
          </Text>
        )}
        {actor && (
          <SimpleAddress address={actor} length={4} fontSize="sm" />
        )}
        {isDonation && amount && token && (
          <AmountDisplay
            amount={amount}
            token={token}
            usdPrice={token === "stx" ? stxPrice : sbtcPrice}
            showUsd={!!(stxPrice || sbtcPrice)}
            size="sm"
          />
        )}
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

      {/* Timestamp + tx link — right-aligned, never wraps */}
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
        <VStack spacing={0} align="stretch" divider={<Divider borderColor="border.subtle" />}>
          {[1, 2, 3].map((i) => (
            <HStack key={i} spacing={3} py={2.5}>
              <SkeletonCircle size="3" />
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
          borderRadius="lg"
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
        {grouped.map((dayGroup, dayIndex) => (
          <Box key={dayGroup.dayKey}>
            {/* Day separator — omit for first group */}
            {dayIndex > 0 && (
              <Divider borderColor="border.subtle" mb={4} />
            )}

            <Text
              fontSize="xs"
              fontWeight="700"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="0.08em"
              mb={1}
            >
              {dayGroup.dayLabel}
            </Text>

            <VStack
              spacing={0}
              align="stretch"
              divider={<Divider borderColor="border.subtle" />}
            >
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
