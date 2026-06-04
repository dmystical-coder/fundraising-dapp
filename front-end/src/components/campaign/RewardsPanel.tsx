"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAddress } from "@/components/ConnectWallet";
import {
  REWARDS_QUERY_PREFIX,
  useRewardsClaimState,
} from "@/hooks/rewardsQueries";
import { buildEarnRewardsTx } from "@/lib/build-earn-rewards-tx";
import {
  executeContractCall,
  isDevnetEnvironment,
  openContractCall,
} from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { MICRO_FSTR_PER_FSTR } from "@/lib/fundstacks-rewards-reads";

interface RewardsPanelProps {
  campaignId: number;
}

const CARD = {
  bg: "bg.surface",
  borderColor: "border.default",
  borderWidth: "1px",
  borderRadius: "2xl",
  boxShadow: "0 1px 2px rgba(15,23,43,0.04)",
} as const;

function formatFstr(microFstr: bigint): string {
  const fstr = Number(microFstr) / Number(MICRO_FSTR_PER_FSTR);
  if (fstr >= 1000) return fstr.toFixed(0);
  if (fstr >= 1) return fstr.toFixed(2);
  return fstr.toFixed(4);
}

// FSTR token coin glyph.
function CoinGlyph({ tone = "primary" }: { tone?: "primary" | "success" }) {
  return (
    <Box
      w="40px"
      h="40px"
      borderRadius="full"
      bg={tone === "success" ? "success.500" : "primary.500"}
      color="text.inverse"
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontFamily="mono"
      fontWeight="800"
      fontSize="lg"
      flexShrink={0}
      boxShadow="inset 0 0 0 2px rgba(255,255,255,0.25)"
    >
      F
    </Box>
  );
}

export function RewardsPanel({ campaignId }: RewardsPanelProps) {
  const donor = useAddress();
  const { currentWallet: devnetWallet } = useDevnetWallet();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: state, isLoading } = useRewardsClaimState(campaignId, donor);

  if (!donor) return null;
  if (isLoading) {
    return (
      <Card {...CARD}>
        <CardHeader pb={2}>
          <Heading size="md">FSTR Rewards</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <Skeleton height="84px" borderRadius="xl" />
        </CardBody>
      </Card>
    );
  }
  if (!state || state.status === "not-eligible") return null;

  const handleEarn = async () => {
    setIsSubmitting(true);
    try {
      const txOptions = buildEarnRewardsTx({ campaignId });

      const onSuccess = (txid: string) => {
        toast.success("Rewards submitted", {
          description: `Claim pending — txid ${txid.slice(0, 8)}…${txid.slice(-6)}`,
        });
        queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_PREFIX });
        setIsSubmitting(false);
      };

      if (isDevnetEnvironment()) {
        const { txid } = await executeContractCall(txOptions, devnetWallet);
        onSuccess(txid);
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: (data) => onSuccess(data.txId),
          onCancel: () => {
            toast.info("Cancelled", { description: "Transaction was cancelled" });
            setIsSubmitting(false);
          },
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Could not submit rewards claim", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Card {...CARD}>
      <CardHeader pb={2}>
        <Heading size="md">FSTR Rewards</Heading>
      </CardHeader>
      <CardBody pt={0}>
        {state.status === "claimable" && (
          <VStack align="stretch" spacing={3}>
            {/* Reward coin card */}
            <HStack
              spacing={3}
              align="center"
              p={4}
              bg="bg.accentSubtle"
              borderWidth="1px"
              borderColor="border.accent"
              borderRadius="xl"
            >
              <CoinGlyph />
              <Box minW={0}>
                <Text
                  fontSize="11px"
                  fontWeight="700"
                  letterSpacing="0.08em"
                  textTransform="uppercase"
                  color="text.tertiary"
                >
                  You&apos;ll earn
                </Text>
                <Text fontWeight="800" color="primary.600" fontSize="2xl" lineHeight="1.1">
                  ~{formatFstr(state.previewTokens)}
                  <Text as="span" fontSize="sm" fontWeight="600" color="text.secondary" ml={1}>
                    FSTR
                  </Text>
                </Text>
              </Box>
            </HStack>

            <Text fontSize="xs" color="text.tertiary">
              Rate scales with funding progress — the earlier you claim, the more
              you earn per STX donated.
            </Text>

            <Button
              colorScheme="primary"
              size="md"
              borderRadius="full"
              fontWeight="700"
              onClick={handleEarn}
              isLoading={isSubmitting}
            >
              Earn {formatFstr(state.previewTokens)} FSTR
            </Button>
          </VStack>
        )}

        {state.status === "claimed" && (
          <HStack
            spacing={3}
            align="center"
            p={4}
            bg="success.50"
            borderWidth="1px"
            borderColor="success.200"
            borderRadius="xl"
          >
            <CoinGlyph tone="success" />
            <Box minW={0}>
              <Text
                fontSize="11px"
                fontWeight="700"
                letterSpacing="0.08em"
                textTransform="uppercase"
                color="success.700"
              >
                Claimed
              </Text>
              <Text fontWeight="800" color="success.700" fontSize="xl" lineHeight="1.1">
                {formatFstr(state.claimedTokens)}
                <Text as="span" fontSize="sm" fontWeight="600" color="success.600" ml={1}>
                  FSTR
                </Text>
              </Text>
              <Text fontSize="xs" color="text.tertiary">
                In your wallet
              </Text>
            </Box>
          </HStack>
        )}
      </CardBody>
    </Card>
  );
}

export default RewardsPanel;
