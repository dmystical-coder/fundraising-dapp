"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
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

function formatFstr(microFstr: bigint): string {
  const fstr = Number(microFstr) / Number(MICRO_FSTR_PER_FSTR);
  if (fstr >= 1000) return fstr.toFixed(0);
  if (fstr >= 1) return fstr.toFixed(2);
  return fstr.toFixed(4);
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
      <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="xl">
        <CardHeader pb={2}>
          <Heading size="md">FSTR Rewards</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <Skeleton height="60px" borderRadius="md" />
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
    <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="xl">
      <CardHeader pb={2}>
        <Heading size="md">FSTR Rewards</Heading>
      </CardHeader>
      <CardBody pt={0}>
        {state.status === "claimable" && (
          <VStack align="stretch" spacing={3}>
            <Text fontSize="sm" color="text.secondary">
              You&apos;ll earn{" "}
              <Text as="span" fontWeight="semibold" color="text.primary">
                ~{formatFstr(state.previewTokens)} FSTR
              </Text>{" "}
              for supporting this campaign early.
            </Text>
            <Text fontSize="xs" color="text.tertiary">
              Rate scales with funding progress — the earlier you claim, the
              more you earn per STX donated.
            </Text>
            <Button
              colorScheme="primary"
              size="md"
              onClick={handleEarn}
              isLoading={isSubmitting}
            >
              Earn {formatFstr(state.previewTokens)} FSTR
            </Button>
          </VStack>
        )}

        {state.status === "claimed" && (
          <VStack align="stretch" spacing={1}>
            <Text fontSize="sm" color="text.secondary">
              You&apos;ve claimed{" "}
              <Text as="span" fontWeight="semibold" color="text.primary">
                {formatFstr(state.claimedTokens)} FSTR
              </Text>{" "}
              for this campaign.
            </Text>
            <Text fontSize="xs" color="text.tertiary">
              FSTR is in your wallet.
            </Text>
          </VStack>
        )}
      </CardBody>
    </Card>
  );
}

export default RewardsPanel;
