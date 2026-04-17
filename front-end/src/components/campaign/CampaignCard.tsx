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
} from "@chakra-ui/react";
import Link from "next/link";
import { StatusBadge, getCampaignStatus } from "../common/StatusBadge";
import { CombinedAmountDisplay } from "../common/AmountDisplay";
import { TimeRemainingDisplay } from "../common/CountdownTimer";
import { SimpleAddress } from "../common/AddressDisplay";

interface CampaignCardProps {
  campaignId: number;
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
  title?: string;
  isPending?: boolean;
}

function calculateProgress(
  totalStx: number,
  totalSbtc: number,
  goal: number | undefined,
  stxPrice?: number,
  sbtcPrice?: number
): number {
  if (!goal || goal === 0) return 0;

  const stxValue = stxPrice ? (totalStx / 1_000_000) * stxPrice : 0;
  const sbtcValue = sbtcPrice ? (totalSbtc / 100_000_000) * sbtcPrice : 0;
  const totalValue = stxValue + sbtcValue;

  const progress = (totalValue / goal) * 100;
  return Math.min(progress, 100);
}

export function CampaignCard({
  campaignId,
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
  isPending,
}: CampaignCardProps) {
  const status = getCampaignStatus({ isCancelled, isWithdrawn, isExpired });

  const stxNum = typeof totalStx === "string" ? parseInt(totalStx, 10) : totalStx;
  const sbtcNum = typeof totalSbtc === "string" ? parseInt(totalSbtc, 10) : totalSbtc;

  const progress = calculateProgress(stxNum, sbtcNum, goal, stxPrice, sbtcPrice);

  const displayTitle = title || `Campaign #${campaignId}`;

  const CardContent = (
    <Card
      role="group"
      position="relative"
      cursor={isPending ? "default" : "pointer"}
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={!isPending ? {
        transform: "translateY(-6px) scale(1.02)",
        boxShadow: "0 12px 40px -15px var(--chakra-colors-primary-400)",
        borderColor: "primary.400",
      } : undefined}
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="2xl"
      overflow="hidden"
      opacity={isPending ? 0.7 : 1}
    >
      {/* Status badge */}
      <Box position="absolute" top={3} right={3} zIndex={1}>
        {isPending ? (
          <StatusBadge status="active" size="sm" overrides={{ label: "Pending", colorScheme: "yellow" }} />
        ) : (
          <StatusBadge status={status} size="sm" />
        )}
      </Box>

      <CardBody p={5}>
        <VStack align="stretch" spacing={4}>
          <Heading
            size="md"
            lineHeight="1.4"
            noOfLines={2}
            color="chakra-body-text"
            pr={16}
            _groupHover={{ color: "primary.500" }}
            transition="color 0.2s"
          >
            {displayTitle}
          </Heading>

          {beneficiary && (
            <HStack spacing={2}>
              <Text fontSize="xs" fontWeight="600" color="text.tertiary" textTransform="uppercase" letterSpacing="wider">
                Beneficiary
              </Text>
              <SimpleAddress address={beneficiary} length={4} fontSize="sm" />
            </HStack>
          )}

          <VStack 
            spacing={4} 
            align="stretch" 
            p={4} 
            bg="bg.accentSubtle" 
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.accent"
          >
            <Box>
              <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em" mb={1}>
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

            {goal && goal > 0 && (
              <Box>
                <HStack justify="space-between" mb={1.5}>
                  <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                    Progress
                  </Text>
                  <Text fontSize="xs" color="primary.600" fontWeight="700">
                    {progress.toFixed(0)}%
                  </Text>
                </HStack>
                <Progress
                  value={progress}
                  size="sm"
                  borderRadius="full"
                  bg="whiteAlpha.400"
                  sx={{
                    "& > div": {
                      bgGradient:
                        progress >= 100
                          ? "linear(to-r, success.400, success.500)"
                          : progress >= 75
                          ? "linear(to-r, primary.400, success.400)"
                          : "linear(to-r, primary.500, secondary.400)",
                    },
                  }}
                />
              </Box>
            )}
          </VStack>

          <HStack justify="space-between" pt={2} borderTop="1px" borderColor="border.default">
            <HStack spacing={1}>
              <Text fontSize="sm" fontWeight="600" color="chakra-body-text">
                {donationCount}
              </Text>
              <Text fontSize="sm" color="text.secondary">
                {donationCount === 1 ? "donor" : "donors"}
              </Text>
            </HStack>

            {endAt && status === "active" && !isPending && (
              <TimeRemainingDisplay endAt={endAt} size="sm" />
            )}
            {isPending && (
              <Text fontSize="xs" color="warning.500" fontWeight="bold">
                Confirming...
              </Text>
            )}
          </HStack>
        </VStack>
      </CardBody>
    </Card>
  );

  if (isPending) {
    return CardContent;
  }

  return (
    <Link href={`/campaigns/${campaignId}`} passHref style={{ textDecoration: "none" }}>
      {CardContent}
    </Link>
  );
}

export default CampaignCard;
