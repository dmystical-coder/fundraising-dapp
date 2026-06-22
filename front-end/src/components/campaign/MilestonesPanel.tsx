"use client";

import { useState } from "react";
import {
  Badge,
  Box,
  Button,
  Card,
  CardBody,
  CardHeader,
  FormControl,
  FormHelperText,
  FormLabel,
  Heading,
  HStack,
  Input,
  Select,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useAddress } from "@/components/ConnectWallet";
import {
  MILESTONES_QUERY_PREFIX,
  useEscrowInfo,
  useTranches,
} from "@/hooks/milestonesQueries";
import { buildCreateEscrowTx } from "@/lib/build-create-escrow-tx";
import { buildVoteReleaseTx } from "@/lib/build-vote-release-tx";
import { buildClaimTrancheTx } from "@/lib/build-claim-tranche-tx";
import {
  executeContractCall,
  isDevnetEnvironment,
  openContractCall,
} from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import type { ContractCallOptions } from "@/lib/contract-utils";

interface MilestonesPanelProps {
  campaignId: number;
  isOwner: boolean;
}

const CARD = {
  bg: "bg.surface",
  borderColor: "border.default",
  borderWidth: "1px",
  borderRadius: "2xl",
  boxShadow: "0 1px 2px rgba(15,23,43,0.04)",
} as const;

function formatStx(microStx: bigint): string {
  const stx = Number(microStx) / 1_000_000;
  if (stx >= 100) return stx.toFixed(0);
  if (stx >= 1) return stx.toFixed(2);
  return stx.toFixed(4);
}

// Status as a colored dot + label, sharing the tranche state's semantic color.
function StatusTag({ claimed, ready }: { claimed: boolean; ready: boolean }) {
  const { label, color } = claimed
    ? { label: "Claimed", color: "text.tertiary" }
    : ready
    ? { label: "Ready", color: "success.600" }
    : { label: "Pending", color: "warning.600" };
  return (
    <HStack spacing={1.5}>
      <Box w="8px" h="8px" borderRadius="full" bg={color} flexShrink={0} />
      <Text fontSize="xs" fontWeight="700" color={color}>
        {label}
      </Text>
    </HStack>
  );
}

// Vote-progress meter with quarter tick marks toward the release threshold.
function MarkedBar({ pct, color }: { pct: number; color: string }) {
  return (
    <Box
      position="relative"
      w="100%"
      h="8px"
      borderRadius="full"
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      overflow="hidden"
    >
      <Box h="100%" w={`${pct}%`} minW={pct > 0 ? "6px" : "0"} borderRadius="full" bg={color} />
      {[25, 50, 75].map((m) => (
        <Box
          key={m}
          position="absolute"
          top="0"
          bottom="0"
          left={`${m}%`}
          w="1px"
          bg="rgba(15,23,43,0.12)"
        />
      ))}
    </Box>
  );
}

export function MilestonesPanel({ campaignId, isOwner }: MilestonesPanelProps) {
  const donor = useAddress();
  const { currentWallet: devnetWallet } = useDevnetWallet();
  const queryClient = useQueryClient();

  const [isCreating, setIsCreating] = useState(false);
  const [submittingTranche, setSubmittingTranche] = useState<number | null>(null);
  const [amountStx, setAmountStx] = useState("");
  const [trancheCount, setTrancheCount] = useState("2");
  const [thresholdStx, setThresholdStx] = useState("");

  const { data: escrow, isLoading: escrowLoading } = useEscrowInfo(campaignId);
  const tranches = useTranches(
    campaignId,
    escrow ? Number(escrow.trancheCount) : null,
    donor
  );

  const execTx = async (
    txOptions: ContractCallOptions,
    successMsg: string,
    desc: string
  ) => {
    const onSuccess = (txid: string) => {
      toast.success(successMsg, {
        description: `${desc} — txid ${txid.slice(0, 8)}…${txid.slice(-6)}`,
      });
      queryClient.invalidateQueries({ queryKey: MILESTONES_QUERY_PREFIX });
    };
    if (isDevnetEnvironment()) {
      const { txid } = await executeContractCall(txOptions, devnetWallet);
      onSuccess(txid);
    } else {
      await openContractCall({
        ...txOptions,
        onFinish: (data) => onSuccess(data.txId),
        onCancel: () =>
          toast.info("Cancelled", { description: "No problem — nothing was sent." }),
      });
    }
  };

  const handleCreate = async () => {
    const amount = parseFloat(amountStx);
    const threshold = parseFloat(thresholdStx);
    if (!amount || amount <= 0 || !threshold || threshold <= 0) return;
    setIsCreating(true);
    try {
      await execTx(
        buildCreateEscrowTx({
          campaignId,
          amount: BigInt(Math.floor(amount * 1_000_000)),
          trancheCount: BigInt(parseInt(trancheCount, 10)),
          releaseThreshold: BigInt(Math.floor(threshold * 1_000_000)),
        }),
        "Milestones set up",
        "Escrow pending confirmation"
      );
    } catch (e) {
      console.error(e);
      toast.error("Couldn't set up milestones", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleVote = async (trancheId: number) => {
    setSubmittingTranche(trancheId);
    try {
      await execTx(
        buildVoteReleaseTx({ campaignId, trancheId }),
        "Vote submitted",
        `Tranche ${trancheId} vote pending`
      );
    } catch (e) {
      console.error(e);
      toast.error("Couldn't submit your vote", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSubmittingTranche(null);
    }
  };

  const handleClaim = async (trancheId: number) => {
    setSubmittingTranche(trancheId);
    try {
      await execTx(
        buildClaimTrancheTx({ campaignId, trancheId }),
        "Tranche claimed",
        `Tranche ${trancheId} payout pending`
      );
    } catch (e) {
      console.error(e);
      toast.error("Couldn't claim that tranche", {
        description: e instanceof Error ? e.message : "Unknown error",
      });
    } finally {
      setSubmittingTranche(null);
    }
  };

  if (escrowLoading) {
    return (
      <Card {...CARD}>
        <CardHeader pb={2}>
          <Heading size="md">Milestones</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <Skeleton height="80px" borderRadius="xl" />
        </CardBody>
      </Card>
    );
  }

  // No escrow: only campaign owner can set one up
  if (!escrow) {
    if (!isOwner) return null;
    const parsedMicro = amountStx ? Math.floor(parseFloat(amountStx) * 1_000_000) : 0;
    const parsedCount = parseInt(trancheCount, 10);
    const perTranche =
      parsedMicro > 0 && parsedCount > 0
        ? Math.floor(parsedMicro / parsedCount / 1_000_000) || 0
        : null;
    const dustStx =
      parsedMicro > 0 && parsedCount > 0
        ? (parsedMicro % parsedCount) / 1_000_000
        : 0;

    return (
      <Card {...CARD}>
        <CardHeader pb={2}>
          <Heading size="md">Milestones</Heading>
        </CardHeader>
        <CardBody pt={0}>
          <VStack spacing={3} align="stretch">
            <Text fontSize="sm" color="text.secondary">
              Lock up some of your own STX. Donors then vote to release it
              tranche by tranche as you hit your milestones.
            </Text>
            <FormControl>
              <FormLabel fontSize="xs" color="text.secondary" mb={1}>
                Escrow amount (STX)
              </FormLabel>
              <Input
                size="sm"
                type="number"
                min={1}
                placeholder="e.g. 100"
                value={amountStx}
                onChange={(e) => setAmountStx(e.target.value)}
                borderRadius="xl"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" color="text.secondary" mb={1}>
                Split into
              </FormLabel>
              <Select
                size="sm"
                value={trancheCount}
                onChange={(e) => setTrancheCount(e.target.value)}
                borderRadius="xl"
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} {n === 1 ? "tranche" : "tranches"}
                  </option>
                ))}
              </Select>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="xs" color="text.secondary" mb={1}>
                Release threshold (STX)
              </FormLabel>
              <Input
                size="sm"
                type="number"
                min={1}
                placeholder="e.g. 50"
                value={thresholdStx}
                onChange={(e) => setThresholdStx(e.target.value)}
                borderRadius="xl"
              />
              <FormHelperText fontSize="xs" color="text.tertiary">
                Total donor vote weight needed to unlock each tranche. Each
                donor&apos;s vote is capped at 100 STX.
              </FormHelperText>
            </FormControl>
            {perTranche !== null && (
              <Text fontSize="xs" color="text.tertiary">
                Each tranche: ~{perTranche.toLocaleString()} STX
              </Text>
            )}
            {dustStx > 0 && (
              <Text fontSize="xs" color="text.warning">
                {dustStx.toFixed(6).replace(/\.?0+$/, "")} STX remainder will
                be permanently locked as dust — use an evenly divisible amount.
              </Text>
            )}
            <Button
              colorScheme="primary"
              size="md"
              borderRadius="full"
              fontWeight="700"
              onClick={handleCreate}
              isLoading={isCreating}
              isDisabled={!amountStx || !thresholdStx}
            >
              Set Up Milestones
            </Button>
          </VStack>
        </CardBody>
      </Card>
    );
  }

  // Escrow exists: show tranche rows
  const threshold = escrow.releaseThreshold;

  return (
    <Card {...CARD}>
      <CardHeader pb={2}>
        <HStack justify="space-between">
          <Heading size="md">Milestones</Heading>
          <Text fontSize="xs" color="text.tertiary">
            {formatStx(escrow.trancheAmount)} STX ea.
          </Text>
        </HStack>
      </CardHeader>
      <CardBody pt={0}>
        <VStack spacing={2.5} align="stretch">
          {tranches.length === 0 ? (
            <Skeleton height="64px" borderRadius="xl" />
          ) : (
            tranches.map((t) => {
              const voteWeight = t.info?.voteWeight ?? BigInt(0);
              const claimed = t.info?.claimed ?? false;
              const isReady =
                threshold > BigInt(0) && voteWeight >= threshold;
              const pct =
                threshold > BigInt(0)
                  ? Math.min(
                      100,
                      Math.floor(
                        (Number(voteWeight) / Number(threshold)) * 100
                      )
                    )
                  : 0;
              const canClaim = isOwner && isReady && !claimed;
              const canVote =
                !!donor && !isOwner && !t.hasVoted && !claimed;
              const showVotedBadge =
                !!donor && !isOwner && t.hasVoted && !claimed;

              return (
                <Box
                  key={t.id}
                  p={3.5}
                  bg="bg.surfaceAlt"
                  borderRadius="xl"
                  borderWidth="1px"
                  borderColor="border.default"
                >
                  <HStack justify="space-between" mb={2.5} align="center">
                    <HStack spacing={2.5}>
                      <Text
                        fontSize="xs"
                        fontWeight="700"
                        color="text.secondary"
                        minW="20px"
                      >
                        #{t.id + 1}
                      </Text>
                      <StatusTag claimed={claimed} ready={isReady} />
                    </HStack>
                    {canClaim && (
                      <Button
                        size="xs"
                        colorScheme="primary"
                        borderRadius="full"
                        fontWeight="700"
                        isLoading={submittingTranche === t.id}
                        isDisabled={submittingTranche !== null}
                        onClick={() => handleClaim(t.id)}
                      >
                        Claim
                      </Button>
                    )}
                    {canVote && (
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme="primary"
                        borderRadius="full"
                        fontWeight="700"
                        isLoading={submittingTranche === t.id}
                        isDisabled={submittingTranche !== null}
                        onClick={() => handleVote(t.id)}
                      >
                        Approve
                      </Button>
                    )}
                    {showVotedBadge && (
                      <Badge
                        colorScheme="blue"
                        variant="subtle"
                        borderRadius="full"
                        px={2}
                        fontSize="xs"
                      >
                        Voted
                      </Badge>
                    )}
                  </HStack>
                  <MarkedBar
                    pct={pct}
                    color={
                      claimed ? "gray.400" : isReady ? "success.500" : "primary.500"
                    }
                  />
                  <Text fontSize="xs" color="text.tertiary" mt={1.5}>
                    {formatStx(voteWeight)} / {formatStx(threshold)} STX approved
                  </Text>
                </Box>
              );
            })
          )}
          <Text fontSize="xs" color="text.tertiary" pt={1}>
            {formatStx(escrow.balance)} STX locked ·{" "}
            {Number(escrow.trancheCount)} tranches
          </Text>
        </VStack>
      </CardBody>
    </Card>
  );
}

export default MilestonesPanel;
