"use client";

import {
  Box,
  Button,
  Card,
  CardBody,
  Heading,
  Text,
  HStack,
  VStack,
  AspectRatio,
  Image,
  usePrefersReducedMotion,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { useRouter } from "next/navigation";
import { StatusBadge, getCampaignStatus } from "../common/StatusBadge";
import { CombinedAmountDisplay } from "../common/AmountDisplay";
import { TimeRemainingDisplay } from "../common/CountdownTimer";
import { SimpleAddress } from "../common/AddressDisplay";
import { WalletIdenticon } from "../common/WalletIdenticon";

interface CampaignCardProps {
  campaignId: number;
  beneficiary: string | null;
  totalStx: number | string;
  totalSbtc: number | string;
  goal?: number;
  endAt?: number;
  /** Number of unique donor addresses (not total donation count). */
  donorCount: number;
  isCancelled: boolean;
  isWithdrawn: boolean;
  isExpired: boolean;
  stxPrice?: number;
  sbtcPrice?: number;
  title?: string;
  isPending?: boolean;
  coverUrl?: string;
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

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

// ─── Uppercase micro-label used across the card ──────────────────────────────
function MicroLabel({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="11px"
      fontWeight="700"
      letterSpacing="0.08em"
      textTransform="uppercase"
      color="text.tertiary"
    >
      {children}
    </Text>
  );
}

// ─── Thin funding bar ─────────────────────────────────────────────────────────
function Bar({
  value,
  color,
  animate,
}: {
  value: number;
  color: string;
  animate: boolean;
}) {
  return (
    <Box
      w="100%"
      h="6px"
      borderRadius="full"
      bg="bg.surfaceAlt"
      borderWidth="1px"
      borderColor="border.default"
      overflow="hidden"
    >
      <Box
        h="100%"
        w={`${value}%`}
        minW={value > 0 ? "8px" : "0"}
        borderRadius="full"
        bg={color}
        transition={animate ? "width 0.4s ease" : undefined}
      />
    </Box>
  );
}

export function CampaignCard({
  campaignId,
  beneficiary,
  totalStx,
  totalSbtc,
  goal,
  endAt,
  donorCount,
  isCancelled,
  isWithdrawn,
  isExpired,
  stxPrice,
  sbtcPrice,
  title,
  isPending,
  coverUrl,
}: CampaignCardProps) {
  const router = useRouter();
  const prefersReducedMotion = usePrefersReducedMotion();
  const status = getCampaignStatus({ isCancelled, isWithdrawn, isExpired });

  const stxNum = typeof totalStx === "string" ? parseInt(totalStx, 10) : totalStx;
  const sbtcNum = typeof totalSbtc === "string" ? parseInt(totalSbtc, 10) : totalSbtc;

  const progress = calculateProgress(stxNum, sbtcNum, goal, stxPrice, sbtcPrice);
  const canDonate = status === "active" && !isPending;
  const hasGoal = !!goal && goal > 0;

  // A campaign whose creator has withdrawn is concluded — show a final result,
  // not a live "raising" bar. progress > 0 implies we had prices to compute it,
  // so we only render the goal outcome when it can be trusted.
  const isConcluded = status === "withdrawn";
  const goalMet = hasGoal && progress >= 100;
  const canShowOutcome = hasGoal && progress > 0;
  // Price-independent truth: a concluded campaign that took in nothing was not
  // "Funded" — relabel it rather than show a contradictory badge.
  const nothingRaised = stxNum <= 0 && sbtcNum <= 0;
  const concludedEmpty = isConcluded && nothingRaised;
  const progressLabel =
    progress > 0 && progress < 1 ? "<1%" : `${progress.toFixed(0)}%`;

  const displayTitle = title || `Campaign #${campaignId}`;
  const href = `/campaigns/${campaignId}`;

  const cardHover =
    !isPending && !prefersReducedMotion
      ? {
          transform: "translateY(-2px)",
          boxShadow: "card",
          borderColor: "border.accent",
        }
      : undefined;

  return (
    <Card
      role="group"
      position="relative"
      transition={prefersReducedMotion ? undefined : "transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease"}
      _hover={cardHover}
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="2xl"
      boxShadow="0 1px 2px rgba(15,23,43,0.04)"
      overflow="hidden"
      opacity={isPending ? 0.7 : 1}
      h="100%"
    >
      {/* Media cover with overlaid status + time pills */}
      <Box position="relative">
        <AspectRatio ratio={16 / 9} w="100%">
          {coverUrl ? (
            <Image src={coverUrl} alt={`Cover for ${displayTitle}`} objectFit="cover" />
          ) : (
            <Box
              bg="bg.surfaceAlt"
              backgroundImage="radial-gradient(var(--chakra-colors-primary-200) 1px, transparent 1px)"
              backgroundSize="20px 20px"
              opacity={0.8}
            />
          )}
        </AspectRatio>

        {/* Status — top-left */}
        <Box position="absolute" top={3} left={3}>
          {isPending ? (
            <StatusBadge
              status="active"
              size="sm"
              overrides={{ label: "Pending", colorScheme: "yellow" }}
              boxShadow="0 1px 3px rgba(15,23,43,0.18)"
            />
          ) : (
            <StatusBadge
              status={status}
              size="sm"
              overrides={concludedEmpty ? { label: "Closed", colorScheme: "gray" } : undefined}
              boxShadow="0 1px 3px rgba(15,23,43,0.18)"
            />
          )}
        </Box>

        {/* Time remaining — top-right, white chip so it reads on any image */}
        {/* `!!endAt` guards the 0 case: a bare `endAt &&` would render the
            number 0 as visible text for open-ended/concluded campaigns. */}
        {!!endAt && status === "active" && !isPending && (
          <Box
            position="absolute"
            top={3}
            right={3}
            bg="bg.surface"
            borderRadius="full"
            px={2.5}
            py={1}
            boxShadow="0 1px 3px rgba(15,23,43,0.18)"
          >
            <TimeRemainingDisplay endAt={endAt} size="sm" />
          </Box>
        )}
      </Box>

      <CardBody p={5}>
        <VStack align="stretch" spacing={4}>
          <Heading
            size="md"
            lineHeight="1.35"
            noOfLines={2}
            color="text.primary"
          >
            {displayTitle}
          </Heading>

          {beneficiary && (
            <HStack spacing={2} minW={0}>
              <MicroLabel>To</MicroLabel>
              <WalletIdenticon address={beneficiary} size={22} />
              <SimpleAddress address={beneficiary} length={4} fontSize="sm" />
            </HStack>
          )}

          {/* Funding block — tinted surface */}
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
              <MicroLabel>Raised</MicroLabel>
              <Box mt={1}>
                {concludedEmpty ? (
                  <Text fontSize="sm" color="text.tertiary" fontWeight="500">
                    No funds raised
                  </Text>
                ) : (
                  <CombinedAmountDisplay
                    stxAmount={stxNum}
                    sbtcAmount={sbtcNum}
                    stxPrice={stxPrice}
                    sbtcPrice={sbtcPrice}
                    size="md"
                  />
                )}
              </Box>
            </Box>

            {isConcluded ? (
              canShowOutcome ? (
                <Box>
                  <HStack justify="space-between" mb={1.5}>
                    <MicroLabel>{goalMet ? "Goal reached" : "Final result"}</MicroLabel>
                    <Text
                      fontSize="xs"
                      fontWeight="700"
                      color={goalMet ? "success.600" : "secondary.600"}
                    >
                      {progressLabel} of goal
                    </Text>
                  </HStack>
                  <Bar
                    value={progress}
                    color={goalMet ? "success.500" : "secondary.500"}
                    animate={false}
                  />
                </Box>
              ) : (
                <Box>
                  <MicroLabel>Status</MicroLabel>
                  <Text fontSize="sm" color="text.secondary" fontWeight="600" mt={1}>
                    Campaign completed
                  </Text>
                </Box>
              )
            ) : hasGoal ? (
              <Box>
                <HStack justify="space-between" mb={1.5}>
                  <MicroLabel>Progress</MicroLabel>
                  <Text fontSize="xs" color="primary.700" fontWeight="700">
                    {progressLabel}
                  </Text>
                </HStack>
                <Bar
                  value={progress}
                  color={progress >= 100 ? "success.500" : "primary.500"}
                  animate={!prefersReducedMotion}
                />
              </Box>
            ) : (
              <Box>
                <MicroLabel>Goal</MicroLabel>
                <Text fontSize="sm" color="text.secondary" fontWeight="500" mt={1}>
                  Open-ended
                </Text>
              </Box>
            )}
          </VStack>

          {/* Meta row — donors · goal */}
          <HStack
            justify="space-between"
            align="center"
            pt={2}
            borderTopWidth="1px"
            borderColor="border.default"
            spacing={3}
          >
            <HStack spacing={1} minW={0}>
              <Text fontSize="sm" fontWeight="700" color="text.primary">
                {donorCount}
              </Text>
              <Text fontSize="sm" color="text.secondary">
                {donorCount === 1 ? "donor" : "donors"}
              </Text>
            </HStack>
            {isPending ? (
              <Text fontSize="xs" color="warning.600" fontWeight="700">
                Confirming…
              </Text>
            ) : (
              hasGoal && (
                <Text fontSize="sm" color="text.secondary">
                  Goal{" "}
                  <Text as="span" fontWeight="700" color="text.primary">
                    {formatUsd(goal!)}
                  </Text>
                </Text>
              )
            )}
          </HStack>

          {!isPending && (
            <HStack spacing={2}>
              {canDonate && (
                <Button
                  onClick={() => router.push(href)}
                  size="sm"
                  flex={1}
                  colorScheme="primary"
                  borderRadius="full"
                  fontWeight="700"
                >
                  Donate
                </Button>
              )}
              <Button
                onClick={() => router.push(href)}
                size="sm"
                variant="outline"
                colorScheme="primary"
                borderRadius="full"
                fontWeight="700"
                rightIcon={<ArrowForwardIcon boxSize={3.5} />}
                flex={canDonate ? 1 : undefined}
                w={canDonate ? "auto" : "100%"}
              >
                {canDonate ? "View" : "View campaign"}
              </Button>
            </HStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}

export default CampaignCard;
