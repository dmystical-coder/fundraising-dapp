"use client";

import {
  Box,
  Button,
  Card,
  CardBody,
  FormControl,
  FormErrorMessage,
  Heading,
  HStack,
  NumberInput,
  NumberInputField,
  SimpleGrid,
  Skeleton,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ExternalLinkIcon, LockIcon, WarningIcon } from "@chakra-ui/icons";
import { useState, useContext } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import HiroWalletContext from "@/components/HiroWalletProvider";
import {
  executeContractCall,
  getConfiguredStacksNetwork,
  isDevnetEnvironment,
  isTestnetEnvironment,
  openContractCall,
} from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { ConnectWalletButton } from "@/components/ConnectWallet";
import { DevnetWalletButton } from "@/components/DevnetWalletButton";
import { buildFundstacksDonateTx } from "@/lib/fundstacks-sdk";
import { getRefundTx } from "@/lib/campaign-utils";
import { useExistingDonation } from "@/hooks/campaignQueries";
import { BADGE_QUERY_PREFIX } from "@/hooks/donorBadgeQueries";
import { REWARDS_QUERY_PREFIX } from "@/hooks/rewardsQueries";
import { computeFee } from "@/lib/fee-splitter-reads";
import { buildPayFeeStxTx, buildPayFeeSbtcTx } from "@/lib/build-pay-fee-tx";
import { FundstacksError } from "@dmystical-coder/fundstacks-headless-sdk";
import {
  btcToSats,
  satsToSbtc,
  stxToUstx,
  usdToSbtc,
  usdToStx,
  useCurrentPrices,
  ustxToStx,
} from "@/lib/currency-utils";

const PRESETS = [10, 25, 50, 100];

// ─── Trust note: a quiet, non-custodial reassurance line ─────────────────────
function TrustNote() {
  return (
    <HStack spacing={1.5} justify="center" color="text.tertiary">
      <LockIcon boxSize={2.5} />
      <Text fontSize="xs">Non-custodial — you sign every transaction</Text>
    </HStack>
  );
}

// ─── Receipt row: uppercase label left, value right ──────────────────────────
function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <HStack justify="space-between" align="center" spacing={3}>
      <Text
        fontSize="11px"
        fontWeight="700"
        letterSpacing="0.06em"
        textTransform="uppercase"
        color="text.tertiary"
        flexShrink={0}
      >
        {label}
      </Text>
      <Text
        fontSize="sm"
        fontWeight="600"
        color="text.primary"
        fontFamily={mono ? "mono" : undefined}
        noOfLines={1}
      >
        {value}
      </Text>
    </HStack>
  );
}

// ─── Success checkmark medallion ─────────────────────────────────────────────
function SuccessMark({ size = 52 }: { size?: number }) {
  const icon = Math.round(size * 0.46);
  return (
    <Box
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      bg="success.50"
      border="1.5px solid"
      borderColor="success.300"
      display="flex"
      alignItems="center"
      justifyContent="center"
      mx="auto"
    >
      <Box color="success.500">
        <svg
          width={icon}
          height={icon}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </Box>
    </Box>
  );
}

interface Props {
  campaignId: number;
  campaignTitle?: string;
  status?: "active" | "cancelled" | "ended";
  hasRefundClaimed?: boolean;
}

export function InlineDonationPanel({
  campaignId,
  campaignTitle,
  status = "active",
  hasRefundClaimed = false,
}: Props) {
  const { mainnetAddress, testnetAddress } = useContext(HiroWalletContext);
  const {
    currentWallet: devnetWallet,
    wallets: devnetWallets,
    setCurrentWallet: setDevnetWallet,
  } = useDevnetWallet();

  const currentWalletAddress = isDevnetEnvironment()
    ? devnetWallet?.stxAddress
    : isTestnetEnvironment()
    ? testnetAddress
    : mainnetAddress;

  const { data: prices } = useCurrentPrices();
  const { data: previousDonation, isLoading: donationLoading } =
    useExistingDonation(currentWalletAddress, campaignId);
  const queryClient = useQueryClient();

  // Donation form state
  const [paymentMethod, setPaymentMethod] = useState<"stx" | "sbtc">("stx");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);
  const [submittedRaw, setSubmittedRaw] = useState(0);
  const [submittedMethod, setSubmittedMethod] = useState<"stx" | "sbtc">("stx");
  const [submittedDisplay, setSubmittedDisplay] = useState("");
  const [feePaid, setFeePaid] = useState(false);
  const [feeLoading, setFeeLoading] = useState(false);

  // Refund state
  const [refundTxId, setRefundTxId] = useState<string | null>(null);
  const [refundLoading, setRefundLoading] = useState(false);

  const hasPriorDonation =
    previousDonation &&
    (previousDonation.stxAmount > 0 || previousDonation.sbtcAmount > 0);

  // ── Donation handlers ────────────────────────────────────────────────────

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
    setErrorMsg(null);
  };

  const handleCustomChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setErrorMsg(null);
  };

  const handleTokenChange = (token: "stx" | "sbtc") => {
    setPaymentMethod(token);
    setSelectedAmount(null);
    setCustomAmount("");
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    const display = selectedAmount
      ? `$${selectedAmount} USD`
      : paymentMethod === "stx"
      ? `${customAmount} STX`
      : `${customAmount} sBTC`;

    let txAmount = 0;

    if (selectedAmount) {
      if (selectedAmount <= 0) {
        setErrorMsg("Please enter a valid donation amount");
        setIsLoading(false);
        return;
      }
      txAmount =
        paymentMethod === "sbtc"
          ? Math.round(btcToSats(usdToSbtc(selectedAmount, prices?.sbtc || 0)))
          : Math.round(Number(stxToUstx(usdToStx(selectedAmount, prices?.stx || 0))));
    } else {
      const tok = Number(customAmount);
      if (!tok || tok <= 0) {
        setErrorMsg("Please enter a valid donation amount");
        setIsLoading(false);
        return;
      }
      txAmount =
        paymentMethod === "sbtc"
          ? Math.round(btcToSats(tok))
          : Math.round(Number(stxToUstx(tok)));
    }

    try {
      const txOptions = buildFundstacksDonateTx({
        campaignId: BigInt(campaignId),
        amount: BigInt(txAmount),
        asset: paymentMethod === "sbtc" ? "sbtc" : "stx",
        senderAddress: currentWalletAddress || "",
      });

      const useDevnet = txOptions.network === "devnet" || isDevnetEnvironment();

      const doSuccess = (txid: string) => {
        setSuccessTxId(txid);
        setSubmittedRaw(txAmount);
        setSubmittedMethod(paymentMethod);
        setSubmittedDisplay(display);
        setIsLoading(false);
        queryClient.invalidateQueries({ queryKey: ["indexer"] });
        queryClient.invalidateQueries({ queryKey: ["campaignInfo", campaignId] });
        queryClient.invalidateQueries({
          queryKey: ["campaignDonations", campaignId, currentWalletAddress],
        });
        queryClient.invalidateQueries({ queryKey: BADGE_QUERY_PREFIX });
        queryClient.invalidateQueries({ queryKey: REWARDS_QUERY_PREFIX });
      };

      if (useDevnet) {
        const { txid } = await executeContractCall(txOptions, devnetWallet);
        doSuccess(txid);
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: (data) => doSuccess(data.txId),
          onCancel: () => {
            toast.info("Cancelled", {
              description: "No problem — nothing was sent.",
              duration: 3000,
            });
            setIsLoading(false);
          },
        });
      }
      setCustomAmount("");
      setSelectedAmount(null);
    } catch (e) {
      console.error(e);
      const description =
        e instanceof FundstacksError
          ? e.message
          : e instanceof Error
          ? e.message
          : "Failed to make contribution";
      toast.error(e instanceof FundstacksError ? "Invalid donation" : "That didn't go through", {
        description,
      });
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/campaigns/${campaignId}`;
    const text = `I just contributed to "${campaignTitle || "a campaign"}" on Stacks! Join me in supporting this project.`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "I just donated!", text, url });
      } catch (err) {
        console.warn("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Link copied!");
    }
  };

  const handlePayFee = async () => {
    if (!submittedRaw) return;
    setFeeLoading(true);
    try {
      const builder =
        submittedMethod === "sbtc" ? buildPayFeeSbtcTx : buildPayFeeStxTx;
      const txOptions = builder({ campaignId, amount: submittedRaw });
      const onSuccess = () => {
        setFeePaid(true);
        setFeeLoading(false);
        toast.success("Fee paid");
      };
      if (isDevnetEnvironment()) {
        await executeContractCall(txOptions, devnetWallet);
        onSuccess();
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: () => onSuccess(),
          onCancel: () => setFeeLoading(false),
        });
      }
    } catch (e) {
      console.error(e);
      setFeeLoading(false);
    }
  };

  const handleReset = () => {
    setSuccessTxId(null);
    setSubmittedRaw(0);
    setSubmittedDisplay("");
    setFeePaid(false);
    setCustomAmount("");
    setSelectedAmount(null);
  };

  // ── Refund handler ────────────────────────────────────────────────────────

  const handleRefund = async () => {
    if (!currentWalletAddress) return;
    setRefundLoading(true);
    try {
      const txOptions = getRefundTx(
        getConfiguredStacksNetwork(),
        currentWalletAddress,
        campaignId,
        previousDonation?.stxAmount ?? 0,
        previousDonation?.sbtcAmount ?? 0,
      );
      const onSuccess = (txid: string) => {
        setRefundTxId(txid);
        setRefundLoading(false);
        queryClient.invalidateQueries({
          queryKey: ["campaignDonations", campaignId, currentWalletAddress],
        });
        queryClient.invalidateQueries({ queryKey: ["campaignInfo", campaignId] });
      };
      if (isDevnetEnvironment()) {
        const { txid } = await executeContractCall(txOptions, devnetWallet);
        onSuccess(txid);
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: (data) => onSuccess(data.txId),
          onCancel: () => setRefundLoading(false),
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Refund didn't go through", {
        description: e instanceof Error ? e.message : "Please try again in a moment.",
      });
      setRefundLoading(false);
    }
  };

  // ── Derived values ────────────────────────────────────────────────────────

  const hint = selectedAmount
    ? paymentMethod === "stx"
      ? `≈ ${usdToStx(selectedAmount, prices?.stx || 0).toFixed(2)} STX`
      : `≈ ${usdToSbtc(selectedAmount, prices?.sbtc || 0).toFixed(8)} sBTC`
    : customAmount
    ? `≈ $${(
        Number(customAmount) *
        (paymentMethod === "stx" ? prices?.stx || 0 : prices?.sbtc || 0)
      ).toFixed(2)}`
    : null;

  const ctaLabel = selectedAmount
    ? `Donate $${selectedAmount}`
    : customAmount
    ? `Donate ${customAmount} ${paymentMethod.toUpperCase()}`
    : "Donate";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Card
      bg="bg.surface"
      borderColor="border.default"
      borderWidth="1px"
      borderRadius="2xl"
      boxShadow="0 1px 2px rgba(15,23,43,0.04)"
    >
      <CardBody p={5}>
        {/* ── Wallet gate ── */}
        {!currentWalletAddress ? (
          <VStack spacing={4} py={2}>
            <Box
              w="44px"
              h="44px"
              borderRadius="full"
              bg="bg.accentSubtle"
              border="1px solid"
              borderColor="border.accent"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <LockIcon boxSize={4} color="primary.600" />
            </Box>
            <VStack spacing={1}>
              <Text fontWeight="700" textAlign="center" color="text.primary">
                {status === "cancelled"
                  ? "Connect your wallet to claim a refund"
                  : "Connect your wallet to donate"}
              </Text>
              <Text fontSize="sm" color="text.secondary" textAlign="center">
                You stay in control — every transaction is signed by you.
              </Text>
            </VStack>
            {isDevnetEnvironment() ? (
              <DevnetWalletButton
                currentWallet={devnetWallet}
                wallets={devnetWallets}
                onWalletSelect={setDevnetWallet}
                w="100%"
              />
            ) : (
              <ConnectWalletButton w="100%" />
            )}
          </VStack>
        ) : status === "cancelled" ? (
          /* ── Refund state ── */
          refundTxId ? (
            <VStack spacing={4} py={2}>
              <SuccessMark />
              <VStack spacing={1}>
                <Text fontWeight="700" fontSize="lg" color="text.primary">
                  Refund submitted
                </Text>
                <Text fontSize="sm" color="text.secondary" textAlign="center">
                  Your contribution will be returned to your wallet.
                </Text>
              </VStack>
              <Box
                w="100%"
                p={3}
                bg="bg.accentSubtle"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="border.accent"
              >
                <DetailRow
                  label="Transaction"
                  value={`${refundTxId.slice(0, 8)}…${refundTxId.slice(-8)}`}
                  mono
                />
              </Box>
            </VStack>
          ) : donationLoading ? (
            <VStack spacing={3} py={2}>
              <Skeleton height="16px" width="60%" />
              <Skeleton height="40px" width="100%" />
            </VStack>
          ) : hasPriorDonation ? (
            <VStack spacing={4} align="stretch">
              <HStack spacing={2}>
                <WarningIcon color="warning.500" boxSize={4} flexShrink={0} />
                <Text fontSize="sm" fontWeight="600" color="text.primary">
                  This campaign was cancelled
                </Text>
              </HStack>

              <Box
                bg="warning.50"
                borderLeft="3px solid"
                borderLeftColor="warning.400"
                borderRadius="lg"
                px={3}
                py={2.5}
              >
                <Text fontSize="xs" fontWeight="600" color="warning.700" mb={1}>
                  Your contribution
                </Text>
                <VStack align="start" spacing={0.5}>
                  {previousDonation!.stxAmount > 0 && (
                    <Text fontSize="sm" color="text.primary">
                      {Number(ustxToStx(previousDonation!.stxAmount)).toFixed(2)} STX
                    </Text>
                  )}
                  {previousDonation!.sbtcAmount > 0 && (
                    <Text fontSize="sm" color="text.primary">
                      {satsToSbtc(previousDonation!.sbtcAmount).toFixed(8)} sBTC
                    </Text>
                  )}
                </VStack>
              </Box>

              <Button
                colorScheme="warning"
                size="lg"
                borderRadius="full"
                fontWeight="700"
                onClick={handleRefund}
                isLoading={refundLoading}
                loadingText="Submitting..."
              >
                Claim Refund
              </Button>

              <TrustNote />
            </VStack>
          ) : hasRefundClaimed ? (
            <VStack spacing={2} py={2} textAlign="center">
              <Box
                w="40px"
                h="40px"
                borderRadius="full"
                bg="success.50"
                border="1.5px solid"
                borderColor="success.300"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mx="auto"
              >
                <Box color="success.500">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </Box>
              </Box>
              <Text fontWeight="600" color="text.primary" fontSize="sm">
                Refund claimed
              </Text>
              <Text fontSize="xs" color="text.secondary">
                Your refund for this cancelled campaign has already been processed.
              </Text>
            </VStack>
          ) : (
            <VStack spacing={2} py={2} textAlign="center">
              <WarningIcon color="warning.400" boxSize={5} />
              <Text fontWeight="600" color="text.primary" fontSize="sm">
                This campaign was cancelled
              </Text>
              <Text fontSize="xs" color="text.secondary">
                You didn&apos;t contribute to this campaign, so no refund is available.
              </Text>
            </VStack>
          )
        ) : successTxId ? (
          /* ── Donation success ── */
          <VStack spacing={4} py={2} align="stretch">
            <VStack spacing={3}>
              <SuccessMark />
              <VStack spacing={0.5}>
                <Text fontWeight="700" fontSize="lg" color="text.primary">
                  Thank you!
                </Text>
                <Text fontSize="sm" color="text.secondary" textAlign="center">
                  Your contribution is on its way.
                </Text>
              </VStack>
            </VStack>

            {/* Receipt */}
            <VStack
              spacing={2.5}
              align="stretch"
              p={4}
              bg="bg.accentSubtle"
              borderRadius="xl"
              borderWidth="1px"
              borderColor="border.accent"
            >
              <DetailRow label="Amount" value={submittedDisplay} />
              <DetailRow
                label="Transaction"
                value={`${successTxId.slice(0, 8)}…${successTxId.slice(-8)}`}
                mono
              />
            </VStack>

            {(() => {
              const feeAmt = computeFee(BigInt(submittedRaw));
              const feeLabel =
                submittedMethod === "sbtc"
                  ? `${feeAmt} sats`
                  : `${(Number(feeAmt) / 1_000_000).toFixed(4)} STX`;
              return Number(feeAmt) > 0 && !feePaid ? (
                <Button
                  size="sm"
                  variant="outline"
                  colorScheme="primary"
                  borderRadius="full"
                  fontWeight="700"
                  width="100%"
                  onClick={handlePayFee}
                  isLoading={feeLoading}
                >
                  Pay {feeLabel} platform fee
                </Button>
              ) : feePaid ? (
                <Text fontSize="sm" color="success.600" textAlign="center" fontWeight="600">
                  Platform fee paid ✓
                </Text>
              ) : null;
            })()}

            <Button
              colorScheme="primary"
              size="md"
              width="100%"
              borderRadius="full"
              fontWeight="700"
              leftIcon={<ExternalLinkIcon />}
              onClick={handleShare}
            >
              Share
            </Button>

            <Button
              variant="ghost"
              size="sm"
              color="text.secondary"
              onClick={handleReset}
            >
              Make another donation
            </Button>
          </VStack>
        ) : (
          /* ── Donation form ── */
          <VStack spacing={5} align="stretch">
            <Heading size="sm" color="text.primary">
              Support this campaign
            </Heading>

            {/* Token toggle — segmented control, active reads in brand violet */}
            <Box>
              <Text
                fontSize="11px"
                fontWeight="700"
                letterSpacing="0.06em"
                textTransform="uppercase"
                color="text.tertiary"
                mb={2}
              >
                Pay with
              </Text>
              <HStack
                spacing={0}
                p="3px"
                bg="bg.surfaceAlt"
                borderRadius="full"
                borderWidth="1px"
                borderColor="border.default"
              >
                {(["stx", "sbtc"] as const).map((tok) => {
                  const active = paymentMethod === tok;
                  return (
                    <Button
                      key={tok}
                      flex={1}
                      h="34px"
                      variant="unstyled"
                      borderRadius="full"
                      fontSize="sm"
                      fontWeight={active ? "700" : "600"}
                      color={active ? "primary.700" : "text.secondary"}
                      bg={active ? "bg.surface" : "transparent"}
                      boxShadow={active ? "0 1px 3px rgba(15,23,43,0.12)" : "none"}
                      transition="color 0.15s ease, background 0.15s ease"
                      _hover={{ color: active ? "primary.700" : "text.primary" }}
                      onClick={() => handleTokenChange(tok)}
                    >
                      {tok === "stx" ? "STX" : "sBTC"}
                    </Button>
                  );
                })}
              </HStack>
            </Box>

            {/* Preset chips — selected reads as lavender fill + violet text */}
            <SimpleGrid columns={4} spacing={2}>
              {PRESETS.map((amount) => {
                const selected = selectedAmount === amount;
                return (
                  <Button
                    key={amount}
                    h="40px"
                    px={1}
                    variant="outline"
                    borderRadius="full"
                    fontSize="sm"
                    fontWeight={selected ? "700" : "600"}
                    bg={selected ? "bg.accentSubtle" : "bg.surface"}
                    color={selected ? "primary.700" : "text.secondary"}
                    borderColor={selected ? "primary.300" : "border.default"}
                    _hover={{
                      borderColor: "border.accent",
                      bg: selected ? "bg.accentSubtle" : "bg.surfaceAlt",
                    }}
                    onClick={() => handlePresetClick(amount)}
                  >
                    ${amount}
                  </Button>
                );
              })}
            </SimpleGrid>

            {/* Prominent amount field with token affix */}
            <FormControl isInvalid={!!errorMsg}>
              <Box position="relative">
                <NumberInput
                  min={0}
                  value={customAmount}
                  onChange={handleCustomChange}
                >
                  <NumberInputField
                    placeholder="Custom amount"
                    h="48px"
                    pr="3.75rem"
                    borderRadius="xl"
                    fontSize="md"
                    fontWeight="600"
                  />
                </NumberInput>
                <Text
                  position="absolute"
                  right="16px"
                  top="50%"
                  transform="translateY(-50%)"
                  fontSize="xs"
                  fontWeight="700"
                  letterSpacing="0.04em"
                  color="text.tertiary"
                  pointerEvents="none"
                >
                  {paymentMethod.toUpperCase()}
                </Text>
              </Box>
              {errorMsg && (
                <FormErrorMessage fontSize="xs">{errorMsg}</FormErrorMessage>
              )}
              {hint && !errorMsg && (
                <Text fontSize="xs" color="text.secondary" textAlign="right" mt={1.5}>
                  {hint}
                </Text>
              )}
            </FormControl>

            <VStack spacing={2.5} align="stretch">
              <Button
                colorScheme="primary"
                size="lg"
                borderRadius="full"
                fontWeight="700"
                onClick={handleSubmit}
                isDisabled={(!selectedAmount && !customAmount) || isLoading}
                isLoading={isLoading}
                loadingText="Submitting..."
              >
                {ctaLabel}
              </Button>

              <TrustNote />
            </VStack>
          </VStack>
        )}
      </CardBody>
    </Card>
  );
}
