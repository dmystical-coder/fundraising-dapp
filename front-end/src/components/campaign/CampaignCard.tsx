"use client";

import {
  Box,
  Card,
  CardBody,
  Heading,
  Text,
  Progress,
  HStack,
  VStack,
  Icon,
} from "@chakra-ui/react";
import Link from "next/link";
import { StatusBadge, getCampaignStatus, CampaignStatus } from "../common/StatusBadge";
import { CombinedAmountDisplay } from "../common/AmountDisplay";
import { TimeRemainingDisplay } from "../common/CountdownTimer";
import { SimpleAddress } from "../common/AddressDisplay";

interface CampaignCardProps {
  campaignId: number;
  owner: string | null;
  beneficiary: string | null;
  totalStx: number | string;
  totalSbtc: number | string;
  goal?: number;
  endAt?: number;
  donationCount: number;
  isCancelled: boolean;
  isWithdrawn: boolean;
  isExpired: boolean;
  stxPrice?: number;
  sbtcPrice?: number;
  title?: string; // For future metadata support
}

/**
 * Calculate progress percentage based on raised amount vs goal.
 * If no goal is set, returns a proportional value based on total raised.
 */
function calculateProgress(
  totalStx: number,
  totalSbtc: number,
  goal: number | undefined,
  stxPrice?: number,
  sbtcPrice?: number
): number {
  if (!goal || goal === 0) return 0;

  // Calculate USD value of raised amount
  const stxValue = stxPrice ? (totalStx / 1_000_000) * stxPrice : 0;
  const sbtcValue = sbtcPrice ? (totalSbtc / 100_000_000) * sbtcPrice : 0;
  const totalValue = stxValue + sbtcValue;

  const progress = (totalValue / goal) * 100;
  return Math.min(progress, 100);
}

/**
 * Campaign card component for grid display.
 */
export function CampaignCard({
  campaignId,
  owner,
  beneficiary,
  totalStx,
  totalSbtc,
  goal,
  endAt,
  donationCount,
  isCancelled,
  isWithdrawn,
  isExpired,
  stxPrice,
  sbtcPrice,
  title,
}: CampaignCardProps) {
  const status = getCampaignStatus({ isCancelled, isWithdrawn, isExpired });

  const stxNum = typeof totalStx === "string" ? parseInt(totalStx, 10) : totalStx;
  const sbtcNum = typeof totalSbtc === "string" ? parseInt(totalSbtc, 10) : totalSbtc;

  const progress = calculateProgress(stxNum, sbtcNum, goal, stxPrice, sbtcPrice);

  // Generate a display title if not provided
  const displayTitle = title || `Campaign #${campaignId}`;

  return (
    <Link href={`/campaigns/${campaignId}`} passHref style={{ textDecoration: "none" }}>
      <Card
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          transform: "translateY(-4px)",
          boxShadow: "lg",
          borderColor: "primary.200",
        }}
        bg="warm.surface"
        borderWidth="1px"
        borderColor="warm.border"
        borderRadius="xl"
        overflow="hidden"
      >
        {/* Status badge positioned at top right */}
        <Box position="absolute" top={3} right={3} zIndex={1}>
          <StatusBadge status={status} size="sm" />
        </Box>

        <CardBody p={5}>
          <VStack align="stretch" spacing={4}>
            {/* Title */}
            <Heading
              size="md"
              noOfLines={2}
              color="gray.800"
              pr={16} // Space for badge
            >
              {displayTitle}
            </Heading>

            {/* Beneficiary */}
            {beneficiary && (
              <HStack spacing={2}>
                <Text fontSize="sm" color="gray.500">
                  Beneficiary:
                </Text>
                <SimpleAddress address={beneficiary} length={4} fontSize="sm" />
              </HStack>
            )}

            {/* Amount raised */}
            <Box>
              <Text fontSize="sm" color="gray.500" mb={1}>
                Raised
              </Text>
              <CombinedAmountDisplay
                stxAmount={stxNum}
                sbtcAmount={sbtcNum}
                stxPrice={stxPrice}
                sbtcPrice={sbtcPrice}
                size="md"
              />
            </Box>

            {/* Progress bar */}
            {goal && goal > 0 && (
              <Box>
                <HStack justify="space-between" mb={1}>
                  <Text fontSize="xs" color="gray.500">
                    Progress
                  </Text>
                  <Text fontSize="xs" color="gray.600" fontWeight="600">
                    {progress.toFixed(0)}%
                  </Text>
                </HStack>
                <Progress
                  value={progress}
                  size="sm"
                  borderRadius="full"
                  bg="warm.muted"
                  sx={{
                    "& > div": {
                      bg:
                        progress >= 100
                          ? "success.500"
                          : progress >= 75
                          ? "success.400"
                          : "primary.500",
                    },
                  }}
                />
              </Box>
            )}

            {/* Footer stats */}
            <HStack justify="space-between" pt={2} borderTop="1px" borderColor="warm.border">
              {/* Donor count */}
              <HStack spacing={1}>
                <Text fontSize="sm" fontWeight="600" color="gray.700">
                  {donationCount}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  {donationCount === 1 ? "donor" : "donors"}
                </Text>
              </HStack>

              {/* Time remaining */}
              {endAt && status === "active" && (
                <TimeRemainingDisplay endAt={endAt} size="sm" />
              )}
            </HStack>
          </VStack>
        </CardBody>
      </Card>
    </Link>
  );
}

export default CampaignCard;
