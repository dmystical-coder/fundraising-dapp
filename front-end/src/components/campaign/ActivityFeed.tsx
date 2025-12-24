"use client";

import {
  Box,
  VStack,
  HStack,
  Text,
  Avatar,
  Skeleton,
  SkeletonCircle,
  Link,
  Badge,
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
      return { label: "Refunded", color: "gray.500", icon: "↩️" };
    default:
      return { label: eventName, color: "gray.500", icon: "📋" };
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
      bg="warm.surface"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="warm.border"
      _hover={{ bg: "warm.muted" }}
      transition="background 0.15s"
    >
      {/* Icon/Avatar */}
      <Box
        w={10}
        h={10}
        borderRadius="full"
        bg="warm.muted"
        display="flex"
        alignItems="center"
        justifyContent="center"
        fontSize="lg"
      >
        {config.icon}
      </Box>

      {/* Content */}
      <VStack align="start" spacing={0} flex={1} minW={0}>
        <HStack spacing={2} flexWrap="wrap">
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
      <VStack align="end" spacing={0} minW="fit-content">
        <Text fontSize="xs" color="gray.400">
          {format(insertedAt)}
        </Text>
        {txid && (
          <Link
            href={getTxExplorerUrl(txid)}
            isExternal
            fontSize="xs"
            color="secondary.500"
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
  showCampaignLinks?: boolean;
  stxPrice?: number;
  sbtcPrice?: number;
  emptyMessage?: string;
}

/**
 * Activity feed list component.
 */
export function ActivityFeed({
  events,
  isLoading = false,
  showCampaignLinks = false,
  stxPrice,
  sbtcPrice,
  emptyMessage = "No activity yet",
}: ActivityFeedProps) {
  if (isLoading) {
    return (
      <VStack spacing={3} align="stretch">
        {[1, 2, 3].map((i) => (
          <HStack key={i} spacing={3} p={4} bg="warm.surface" borderRadius="lg">
            <SkeletonCircle size="10" />
            <VStack align="start" flex={1} spacing={1}>
              <Skeleton height="14px" width="60%" />
              <Skeleton height="12px" width="40%" />
            </VStack>
            <Skeleton height="12px" width="60px" />
          </HStack>
        ))}
      </VStack>
    );
  }

  if (!events || events.length === 0) {
    return (
      <Box
        py={8}
        px={4}
        textAlign="center"
        bg="warm.muted"
        borderRadius="lg"
        borderWidth="1px"
        borderColor="warm.border"
      >
        <Text color="gray.500">{emptyMessage}</Text>
      </Box>
    );
  }

  return (
    <VStack spacing={2} align="stretch">
      {events.map((event, index) => {
        const campaignId = "campaign_id" in event ? event.campaign_id : undefined;
        return (
          <ActivityFeedItem
            key={`${event.txid || index}-${event.event_name}-${index}`}
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
  );
}

export default ActivityFeed;
