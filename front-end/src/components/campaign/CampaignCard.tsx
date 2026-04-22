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
  useColorModeValue,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import { useRouter } from "next/navigation";
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
  coverUrl,
}: CampaignCardProps) {
  const router = useRouter();
  const status = getCampaignStatus({ isCancelled, isWithdrawn, isExpired });
  const progressTrackBg = useColorModeValue("gray.300", "whiteAlpha.300");
  const progressTrackBorder = useColorModeValue("gray.400", "whiteAlpha.400");

  const stxNum = typeof totalStx === "string" ? parseInt(totalStx, 10) : totalStx;
  const sbtcNum = typeof totalSbtc === "string" ? parseInt(totalSbtc, 10) : totalSbtc;

  const progress = calculateProgress(stxNum, sbtcNum, goal, stxPrice, sbtcPrice);
  const canDonate = status === "active" && !isPending;

  const displayTitle = title || `Campaign #${campaignId}`;

  const CardContent = (
    <Card
      role="group"
      cursor="default"
      transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      _hover={!isPending ? {
        transform: "translateY(-4px)",
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
      {/* Media Cover */}
      <AspectRatio ratio={16 / 9} w="100%" borderBottomWidth="1px" borderColor="border.default">
        {coverUrl ? (
          <Image src={coverUrl} alt={`Cover for ${displayTitle}`} objectFit="cover" />
        ) : (
          <Box
            bg="bg.surfaceAlt"
            backgroundImage="radial-gradient(var(--chakra-colors-primary-200) 1px, transparent 1px)"
            backgroundSize="20px 20px"
            opacity={0.8}
            display="flex"
            alignItems="center"
            justifyContent="center"
          />
        )}
      </AspectRatio>

      <CardBody p={5}>
        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between" align="start" spacing={3}>
            {isPending ? (
              <StatusBadge status="active" size="sm" overrides={{ label: "Pending", colorScheme: "yellow" }} />
            ) : (
              <StatusBadge status={status} size="sm" />
            )}
            {endAt && status === "active" && !isPending && (
              <TimeRemainingDisplay endAt={endAt} size="sm" />
            )}
          </HStack>

          <Heading
            size="md"
            lineHeight="1.4"
            noOfLines={2}
            color="chakra-body-text"
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

            {goal && goal > 0 ? (
              <Box>
                <HStack justify="space-between" mb={1.5}>
                  <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em">
                    Progress
                  </Text>
                  <Text fontSize="xs" color="primary.600" fontWeight="700">
                    {progress.toFixed(0)}%
                  </Text>
                </HStack>
                <Box
                  w="100%"
                  h="8px"
                  borderRadius="full"
                  bg={progressTrackBg}
                  borderWidth="1px"
                  borderColor={progressTrackBorder}
                  overflow="hidden"
                >
                  <Box
                    h="100%"
                    w={`${progress}%`}
                    minW={progress > 0 ? "10px" : "0"}
                    borderRadius="full"
                    bgGradient={
                      progress >= 100
                        ? "linear(to-r, success.500, success.600)"
                        : progress >= 75
                        ? "linear(to-r, primary.600, success.500)"
                        : "linear(to-r, primary.700, secondary.500)"
                    }
                  />
                </Box>
              </Box>
            ) : (
              <Box>
                <Text fontSize="xs" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em" mb={1.5}>
                  Goal
                </Text>
                <Text fontSize="sm" color="text.tertiary" fontWeight="500">
                  Open-ended
                </Text>
              </Box>
            )}
          </VStack>

          <HStack justify="space-between" pt={2} borderTop="1px" borderColor="border.default" align="center">
            <HStack spacing={1} minW={0}>
              <Text fontSize="sm" fontWeight="600" color="chakra-body-text">
                {donationCount}
              </Text>
              <Text fontSize="sm" color="text.secondary">
                {donationCount === 1 ? "donor" : "donors"}
              </Text>
            </HStack>
            {isPending && (
              <Text fontSize="xs" color="warning.500" fontWeight="bold">
                Confirming...
              </Text>
            )}
          </HStack>

          {!isPending && (
            <HStack spacing={2} justify="stretch">
              {canDonate && (
                <Button
                  onClick={() => router.push(`/campaigns/${campaignId}`)}
                  size="sm"
                  flex={1}
                  variant="solid"
                  bg={{ _light: "gray.800", _dark: "gray.100" }}
                  color={{ _light: "white", _dark: "gray.900" }}
                  borderWidth="1px"
                  borderColor={{ _light: "gray.900", _dark: "gray.300" }}
                  boxShadow="sm"
                  _hover={{
                    bg: { _light: "gray.900", _dark: "white" },
                    borderColor: { _light: "black", _dark: "gray.200" },
                    transform: "translateY(-1px)",
                    boxShadow: "md",
                  }}
                  _active={{
                    bg: { _light: "black", _dark: "gray.300" },
                    borderColor: { _light: "black", _dark: "gray.400" },
                    transform: "translateY(0)",
                  }}
                >
                  Donate
                </Button>
              )}
              <Button
                onClick={() => router.push(`/campaigns/${campaignId}`)}
                size="sm"
                variant="outline"
                colorScheme="primary"
                rightIcon={<ArrowForwardIcon boxSize={3.5} />}
                flex={canDonate ? 1 : undefined}
                w={canDonate ? "auto" : "100%"}
              >
                {canDonate ? "View" : "View Campaign"}
              </Button>
            </HStack>
          )}
        </VStack>
      </CardBody>
    </Card>
  );

  if (isPending) {
    return CardContent;
  }

  return CardContent;
}

export default CampaignCard;
