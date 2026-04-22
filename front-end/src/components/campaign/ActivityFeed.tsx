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
import type { CampaignEvent, ActivityEvent } from "@/hooks/indexerQueries";

// ============================================================================
// Single Activity Item
// ============================================================================

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
  isFirstInGroup?: boolean;
}

/**
 * Get event display configuration.
 */
function getEventConfig(eventName: string): {
  label: string;
  color: string;
  icon: string;
} {
  switch (eventName) {
    case "campaign-created":
      return { label: "Created", color: "primary.500", icon: "🎉" };
    case "donated-stx":
      return { label: "Donated STX", color: "secondary.500", icon: "💰" };
    case "donated-sbtc":
      return { label: "Donated sBTC", color: "warning.500", icon: "🪙" };
    case "campaign-cancelled":
      return { label: "Cancelled", color: "error.500", icon: "❌" };
    case "campaign-withdrawn":
      return { label: "Withdrawn", color: "success.500", icon: "✅" };
    case "refunded":
      return { label: "Refunded", color: "text.secondary", icon: "↩️" };
    default:
      return { label: eventName, color: "text.secondary", icon: "📋" };
  }
}

/**
 * Get the relevant actor for the event.
 */
function getEventActor(
  eventName: string,
  donor?: string | null,
  owner?: string | null,
  beneficiary?: string | null
): string | null {
  if (eventName.startsWith("donated-") || eventName === "refunded") {
    return donor || null;
  }
  if (eventName === "campaign-created" || eventName === "campaign-cancelled") {
    return owner || null;
  }
  if (eventName === "campaign-withdrawn") {
    return beneficiary || null;
  }
  return donor || owner || beneficiary || null;
}

/**
 * Get explorer URL for transaction.
 */
function getTxExplorerUrl(txid: string): string {
  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK || "mainnet";
  const suffix = network === "testnet" ? "?chain=testnet" : "";
  return `https://explorer.stacks.co/txid/${txid}${suffix}`;
}

/**
 * Single activity feed item.
 */
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
  isFirstInGroup = false,
}: ActivityFeedItemProps) {
  const config = getEventConfig(eventName);
  const actor = getEventActor(eventName, donor, owner, beneficiary);
  const isDonation = eventName.startsWith("donated-");
  const token = eventName === "donated-stx" ? "stx" : eventName === "donated-sbtc" ? "sbtc" : null;

  return (
    <HStack
      spacing={3}
      py={3}
      px={4}
      minH="52px"
      bg="bg.surface"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="border.default"
      borderTopLeftRadius={isFirstInGroup ? "xl" : "lg"}
      borderTopRightRadius={isFirstInGroup ? "xl" : "lg"}
      _hover={{ bg: "bg.surfaceAlt" }}
      transition="background 0.15s"
      align="flex-start"
      flexDirection={{ base: "column", sm: "row" }}
    >
      {/* Icon/Avatar */}
      <Box
        w={10}
        h={10}
        borderRadius="full"
        bg="bg.surfaceAlt"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="lg"
      >
        {config.icon}
      </Box>

      {/* Content */}
      <VStack align="start" spacing={0} flex={1} minW={0}>
        <HStack spacing={2} flexWrap="wrap" width="100%">
          <Text fontSize="sm" fontWeight="600" color={config.color}>
            {config.label}
          </Text>
          {actor && <SimpleAddress address={actor} length={4} fontSize="sm" />}
          {showCampaignLink && campaignId && (
            <Link href={`/campaigns/${campaignId}`} color="secondary.600" fontSize="sm">
              Campaign #{campaignId}
            </Link>
          )}
        </HStack>

        {/* Amount for donations */}
        {isDonation && amount && token && (
          <AmountDisplay
            amount={amount}
            token={token}
            usdPrice={token === "stx" ? stxPrice : sbtcPrice}
            showUsd={!!stxPrice || !!sbtcPrice}
            size="sm"
          />
        )}
      </VStack>

      {/* Timestamp */}
      <VStack
        align={{ base: "start", sm: "end" }}
        spacing={0}
        minW={{ base: "auto", sm: "fit-content" }}
        pl={{ base: 12, sm: 0 }}
      >
        <Text fontSize="xs" color="text.tertiary">
          {format(insertedAt)}
        </Text>
        {txid && (
          <Link
            href={getTxExplorerUrl(txid)}
            isExternal
            fontSize="xs"
            color="primary.500"
            _hover={{ textDecor: "underline" }}
          >
            View tx
          </Link>
        )}
      </VStack>
    </HStack>
  );
}

// ============================================================================
// Activity Feed List
// ============================================================================

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

interface GroupedActivityEvents {
  dayKey: string;
  dayLabel: string;
  eventGroups: Array<{
    eventName: string;
    events: (CampaignEvent | ActivityEvent)[];
  }>;
}

function getDayKey(insertedAt: string): string {
  return new Date(insertedAt).toISOString().slice(0, 10);
}

function getDayLabelFromKey(dayKey: string): string {
  const [year, month, day] = dayKey.split("-").map((part) => parseInt(part, 10));
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function groupEventsByDayAndType(
  events: (CampaignEvent | ActivityEvent)[]
): GroupedActivityEvents[] {
  const grouped = new Map<string, Map<string, (CampaignEvent | ActivityEvent)[]>>();

  events.forEach((event) => {
    const dayKey = getDayKey(event.inserted_at);
    if (!grouped.has(dayKey)) {
      grouped.set(dayKey, new Map());
    }

    const dayGroup = grouped.get(dayKey)!;
    if (!dayGroup.has(event.event_name)) {
      dayGroup.set(event.event_name, []);
    }
    dayGroup.get(event.event_name)!.push(event);
  });

  return Array.from(grouped.entries()).map(([dayKey, eventMap]) => ({
    dayKey,
    dayLabel: getDayLabelFromKey(dayKey),
    eventGroups: Array.from(eventMap.entries()).map(([eventName, dayEvents]) => ({
      eventName,
      events: dayEvents,
    })),
  }));
}

/**
 * Activity feed list component.
 */
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
        <VStack spacing={3} align="stretch">
          {[1, 2, 3].map((i) => (
            <HStack key={i} spacing={3} p={4} minH="52px" bg="bg.surface" borderRadius="lg">
              <SkeletonCircle size="10" />
              <VStack align="start" flex={1} spacing={1}>
                <Skeleton height="14px" width="60%" />
                <Skeleton height="12px" width="40%" />
              </VStack>
              <Skeleton height="12px" width="60px" />
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
          px={4}
          textAlign="center"
          bg="bg.surfaceAlt"
          borderRadius="lg"
          borderWidth="1px"
          borderColor="border.default"
        >
          <Text color="text.secondary">{emptyMessage}</Text>
        </Box>
      </Box>
    );
  }

  const groupedEvents = groupEventsByDayAndType(events);

  return (
    <Box role="region" aria-label={ariaLabel}>
      <VStack spacing={4} align="stretch">
        {groupedEvents.map((dayGroup) => (
          <Box key={dayGroup.dayKey}>
            <Text
              fontSize="xs"
              fontWeight="700"
              color="text.tertiary"
              textTransform="uppercase"
              letterSpacing="0.08em"
              px={1}
              mb={2}
            >
              {dayGroup.dayLabel}
            </Text>

            <VStack spacing={2} align="stretch">
              {dayGroup.eventGroups.map((eventGroup) => {
                const eventConfig = getEventConfig(eventGroup.eventName);

                return (
                  <Box key={`${dayGroup.dayKey}-${eventGroup.eventName}`}>
                    <Text fontSize="xs" color={eventConfig.color} fontWeight="600" px={1} mb={1}>
                      {eventConfig.label}
                    </Text>
                    <VStack spacing={2} align="stretch">
                      {eventGroup.events.map((event, index) => {
                        const campaignId = "campaign_id" in event ? event.campaign_id : undefined;
                        return (
                          <ActivityFeedItem
                            key={`${event.txid || `${dayGroup.dayKey}-${eventGroup.eventName}-${index}`}`}
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
                            isFirstInGroup={index === 0}
                          />
                        );
                      })}
                    </VStack>
                  </Box>
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
