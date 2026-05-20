"use client";

import { useState } from "react";
import {
  Badge,
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
  BADGE_QUERY_PREFIX,
  useBadgeClaimState,
} from "@/hooks/donorBadgeQueries";
import { BadgeTier, tierLabel } from "@/lib/donor-badges-reads";
import { buildClaimBadgeTx } from "@/lib/build-claim-badge-tx";
import {
  executeContractCall,
  isDevnetEnvironment,
  openContractCall,
} from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";

interface DonorBadgePanelProps {
  campaignId: number;
}

const TIER_COLOR_SCHEME: Record<string, string> = {
  bronze: "orange",
  silver: "gray",
  gold: "yellow",
};

function TierBadge({ tier }: { tier: BadgeTier }) {
  const label = tierLabel(tier);
  if (label === "none") return null;
  const scheme = TIER_COLOR_SCHEME[label];
  return (
    <Badge
      colorScheme={scheme}
      variant="solid"
      fontSize="sm"
      px={3}
      py={1}
      borderRadius="full"
      textTransform="capitalize"
    >
      {label}
    </Badge>
  );
}

// Render a clean STX number from microSTX (no currency conversion -- this
// is the contract's tier-input value, not USD).
function formatStx(microStx: bigint): string {
  const stx = Number(microStx) / 1_000_000;
  if (stx >= 100) return stx.toFixed(0);
  if (stx >= 1) return stx.toFixed(2);
  return stx.toFixed(4);
}

export function DonorBadgePanel({ campaignId }: DonorBadgePanelProps) {
  const donor = useAddress();
  const { currentWallet: devnetWallet } = useDevnetWallet();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: state, isLoading } = useBadgeClaimState(campaignId, donor);

  // Hide the panel entirely when there's nothing useful to show: no wallet
  // connected, or wallet connected but hasn't donated yet. Avoids cluttering
  // the sidebar for visitors browsing campaigns.
  if (!donor) return null;
  if (isLoading) {
    return (
      <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="xl">
        <CardHeader pb={2}>
          <Heading size="md">Donor Badge</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <Skeleton height="80px" borderRadius="md" />
        </CardBody>
      </Card>
    );
  }
  if (!state) return null;
  if (state.status === "not-eligible" && state.donatedStxEquivalent === BigInt(0)) {
    return null;
  }

  const handleClaim = async (targetTier: BadgeTier) => {
    setIsSubmitting(true);
    try {
      const txOptions = buildClaimBadgeTx({ campaignId });
      const isUpgrade = state.status === "upgradeable";
      const verb = isUpgrade ? "Upgrade" : "Claim";

      const onSuccess = (txid: string) => {
        toast.success(`${verb} submitted`, {
          description: `${verb} to ${tierLabel(targetTier)} pending — txid ${txid.slice(0, 8)}…${txid.slice(-6)}`,
        });
        queryClient.invalidateQueries({ queryKey: BADGE_QUERY_PREFIX });
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
      toast.error("Could not submit badge claim", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
      setIsSubmitting(false);
    }
  };

  return (
    <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="xl">
      <CardHeader pb={2}>
        <Heading size="md">Donor Badge</Heading>
      </CardHeader>
      <CardBody pt={0}>
        {state.status === "not-eligible" && (
          <VStack align="stretch" spacing={2}>
            <Text fontSize="sm" color="text.secondary">
              You&apos;ve donated {formatStx(state.donatedStxEquivalent)} STX equivalent. Donate at
              least 1 STX to earn a Bronze badge.
            </Text>
            <Text fontSize="xs" color="text.tertiary">
              Tiers: Bronze ≥ 1 STX · Silver ≥ 10 STX · Gold ≥ 100 STX
            </Text>
          </VStack>
        )}

        {state.status === "claimable" && (
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="text.secondary">
                You qualify for a
              </Text>
              <TierBadge tier={state.previewTier} />
            </HStack>
            <Text fontSize="xs" color="text.tertiary">
              Soulbound NFT — proves you supported this campaign. Non-transferable.
            </Text>
            <Button
              colorScheme="primary"
              size="md"
              onClick={() => handleClaim(state.previewTier)}
              isLoading={isSubmitting}
            >
              Claim {tierLabel(state.previewTier)} badge
            </Button>
          </VStack>
        )}

        {state.status === "claimed" && (
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="text.secondary">
                Your badge
              </Text>
              <TierBadge tier={state.metadata.tier} />
            </HStack>
            <Text fontSize="xs" color="text.tertiary">
              Token #{state.metadata.tokenId.toString()} · soulbound
            </Text>
          </VStack>
        )}

        {state.status === "upgradeable" && (
          <VStack align="stretch" spacing={3}>
            <HStack justify="space-between">
              <Text fontSize="sm" color="text.secondary">
                Current
              </Text>
              <TierBadge tier={state.metadata.tier} />
            </HStack>
            <HStack justify="space-between">
              <Text fontSize="sm" color="text.secondary">
                Now eligible for
              </Text>
              <TierBadge tier={state.previewTier} />
            </HStack>
            <Button
              colorScheme="primary"
              size="md"
              onClick={() => handleClaim(state.previewTier)}
              isLoading={isSubmitting}
            >
              Upgrade to {tierLabel(state.previewTier)}
            </Button>
          </VStack>
        )}

      </CardBody>
    </Card>
  );
}

export default DonorBadgePanel;
