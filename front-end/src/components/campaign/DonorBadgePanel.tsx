"use client";

import { Fragment, useState } from "react";
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
import { LockIcon } from "@chakra-ui/icons";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAddress } from "@/components/ConnectWallet";
import {
  BADGE_QUERY_PREFIX,
  useBadgeClaimState,
} from "@/hooks/donorBadgeQueries";
import {
  BadgeTier,
  TIER_BRONZE,
  TIER_SILVER,
  TIER_GOLD,
  tierForAmount,
  tierLabel,
} from "@/lib/donor-badges-reads";
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

const CARD = {
  bg: "bg.surface",
  borderColor: "border.default",
  borderWidth: "1px",
  borderRadius: "2xl",
  boxShadow: "0 1px 2px rgba(15,23,43,0.04)",
} as const;

const TIER_STEPS = [
  { tier: TIER_BRONZE, label: "Bronze", stx: 1 },
  { tier: TIER_SILVER, label: "Silver", stx: 10 },
  { tier: TIER_GOLD, label: "Gold", stx: 100 },
] as const;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function formatStx(microStx: bigint): string {
  const stx = Number(microStx) / 1_000_000;
  if (stx >= 100) return stx.toFixed(0);
  if (stx >= 1) return stx.toFixed(2);
  return stx.toFixed(4);
}

// How much more is needed to reach the next tier, or null at the top tier.
function nextTier(stx: number): { label: string; remaining: number } | null {
  if (stx < 1) return { label: "Bronze", remaining: 1 - stx };
  if (stx < 10) return { label: "Silver", remaining: 10 - stx };
  if (stx < 100) return { label: "Gold", remaining: 100 - stx };
  return null;
}

// ─── Hero medallion: badge art on a soft lavender radial ─────────────────────
function Medallion({
  label,
  dim,
  size = 96,
}: {
  label: "none" | "bronze" | "silver" | "gold";
  dim?: boolean;
  size?: number;
}) {
  return (
    <Box
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      mx="auto"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="bg.accentSubtle"
      borderWidth="1px"
      borderColor="border.accent"
      sx={{
        backgroundImage:
          "radial-gradient(circle at 50% 32%, var(--chakra-colors-primary-100), transparent 70%)",
      }}
    >
      {label === "none" ? (
        <LockIcon boxSize={6} color="primary.400" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/badges/${label}.svg`}
          alt={`${label} donor badge`}
          width={Math.round(size * 0.66)}
          style={dim ? { opacity: 0.55 } : undefined}
        />
      )}
    </Box>
  );
}

// ─── Bronze → Silver → Gold ladder with the donor's current standing ─────────
function TierLadder({ qualified }: { qualified: BadgeTier }) {
  return (
    <HStack spacing={0} align="flex-start" w="100%" px={1}>
      {TIER_STEPS.map((step, i) => {
        const reached = qualified >= step.tier;
        return (
          <Fragment key={step.label}>
            {i > 0 && (
              <Box
                flex="1"
                h="2px"
                mt="6px"
                bg={reached ? "primary.400" : "border.default"}
              />
            )}
            <VStack spacing={1} flexShrink={0} minW="48px">
              <Box
                w="14px"
                h="14px"
                borderRadius="full"
                bg={reached ? "primary.500" : "bg.surface"}
                borderWidth="2px"
                borderColor={reached ? "primary.500" : "border.default"}
              />
              <Text
                fontSize="10px"
                fontWeight="700"
                textTransform="uppercase"
                letterSpacing="0.04em"
                color={reached ? "primary.700" : "text.tertiary"}
              >
                {step.label}
              </Text>
              <Text fontSize="10px" color="text.tertiary" mt="-1">
                {step.stx} STX
              </Text>
            </VStack>
          </Fragment>
        );
      })}
    </HStack>
  );
}

export function DonorBadgePanel({ campaignId }: DonorBadgePanelProps) {
  const donor = useAddress();
  const { currentWallet: devnetWallet } = useDevnetWallet();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: state, isLoading } = useBadgeClaimState(campaignId, donor);

  // Hide the panel entirely when there's nothing useful to show: no wallet
  // connected, or wallet connected but hasn't donated yet.
  if (!donor) return null;
  if (isLoading) {
    return (
      <Card {...CARD}>
        <CardHeader pb={2}>
          <Heading size="md">Donor Badge</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <Skeleton height="160px" borderRadius="xl" />
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

  // ── Derive the unified medallion + ladder presentation ──────────────────
  const stxNum = Number(state.donatedStxEquivalent) / 1_000_000;
  const qualified = tierForAmount(state.donatedStxEquivalent);
  const next = nextTier(stxNum);

  let medallion: "none" | "bronze" | "silver" | "gold" = "none";
  let dim = false;
  let headline = "";
  let sub = "";
  let cta: { label: string; tier: BadgeTier } | null = null;

  if (state.status === "not-eligible") {
    medallion = "none";
    headline = "Not yet eligible";
    sub = `${formatStx(state.donatedStxEquivalent)} STX donated`;
  } else if (state.status === "claimable") {
    medallion = tierLabel(state.previewTier);
    dim = true;
    headline = `Qualifies for ${cap(tierLabel(state.previewTier))}`;
    sub = `${formatStx(state.donatedStxEquivalent)} STX donated`;
    cta = { label: `Claim ${cap(tierLabel(state.previewTier))} badge`, tier: state.previewTier };
  } else if (state.status === "claimed") {
    medallion = tierLabel(state.metadata.tier);
    headline = `You're ${cap(tierLabel(state.metadata.tier))}`;
    sub = `Token #${state.metadata.tokenId.toString()} · soulbound`;
  } else {
    // upgradeable
    medallion = tierLabel(state.previewTier);
    headline = "Upgrade available";
    sub = `Now ${cap(tierLabel(state.metadata.tier))} · ${formatStx(state.donatedStxEquivalent)} STX donated`;
    cta = { label: `Upgrade to ${cap(tierLabel(state.previewTier))}`, tier: state.previewTier };
  }

  return (
    <Card {...CARD}>
      <CardHeader pb={2}>
        <Heading size="md">Donor Badge</Heading>
      </CardHeader>
      <CardBody pt={0}>
        <VStack align="stretch" spacing={4}>
          <Medallion label={medallion} dim={dim} />

          <VStack spacing={0.5}>
            <Text fontWeight="700" color="text.primary" textAlign="center">
              {headline}
            </Text>
            <Text fontSize="sm" color="text.secondary" textAlign="center">
              {sub}
            </Text>
          </VStack>

          <TierLadder qualified={qualified} />

          <Text fontSize="xs" color="text.tertiary" textAlign="center">
            {next
              ? `${next.remaining.toFixed(2)} STX to ${next.label}`
              : "Top tier reached — Gold"}
          </Text>

          {cta && (
            <Button
              colorScheme="primary"
              size="md"
              borderRadius="full"
              fontWeight="700"
              onClick={() => handleClaim(cta.tier)}
              isLoading={isSubmitting}
            >
              {cta.label}
            </Button>
          )}

          {state.status === "claimed" && (
            <Text fontSize="xs" color="text.tertiary" textAlign="center">
              Soulbound NFT · non-transferable · proves you supported this campaign
            </Text>
          )}
        </VStack>
      </CardBody>
    </Card>
  );
}

export default DonorBadgePanel;
