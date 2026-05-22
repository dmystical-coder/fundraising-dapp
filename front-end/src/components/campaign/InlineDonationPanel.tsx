"use client";

import {
  Box,
  Button,
  ButtonGroup,
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
import { ExternalLinkIcon, WarningIcon } from "@chakra-ui/icons";
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

interface Props {
  campaignId: number;
  campaignTitle?: string;
  status?: "active" | "cancelled" | "ended" | "withdrawn";
}

export function InlineDonationPanel({
  campaignId,
  campaignTitle,
  status = "active",
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
              description: "Transaction was cancelled",
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
      toast.error(e instanceof FundstacksError ? "Invalid donation" : "Error", {
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
      toast.error("Refund failed", {
        description: e instanceof Error ? e.message : "Could not process refund",
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
      borderRadius="xl"
    >
      <CardBody>
        {/* ── Wallet gate ── */}
        {!currentWalletAddress ? (
          <VStack spacing={3} py={2}>
            <Text fontWeight="600" textAlign="center" color="chakra-body-text">
              {status === "cancelled"
                ? "Connect your wallet to claim a refund"
                : "Connect your wallet to donate"}
            </Text>
            <Text fontSize="sm" color="text.secondary" textAlign="center">
              Non-custodial — you sign every transaction.
            </Text>
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
            <VStack spacing={3} py={2} textAlign="center">
              <Box
                w="52px"
                h="52px"
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
                    width="24"
                    height="24"
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
              <VStack spacing={0.5}>
                <Text fontWeight="700" fontSize="lg" color="chakra-body-text">
                  Refund submitted
                </Text>
                <Text fontSize="sm" color="text.secondary">
                  Your contribution will be returned to your wallet.
                </Text>
                <Text
                  fontSize="xs"
                  color="text.tertiary"
                  fontFamily="mono"
                  mt={0.5}
                >
                  {refundTxId.slice(0, 8)}…{refundTxId.slice(-8)}
                </Text>
              </VStack>
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
                <Text fontSize="sm" fontWeight="600" color="chakra-body-text">
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
                    <Text fontSize="sm" color="chakra-body-text">
                      {Number(ustxToStx(previousDonation!.stxAmount)).toFixed(2)} STX
                    </Text>
                  )}
                  {previousDonation!.sbtcAmount > 0 && (
                    <Text fontSize="sm" color="chakra-body-text">
                      {satsToSbtc(previousDonation!.sbtcAmount).toFixed(8)} sBTC
                    </Text>
                  )}
                </VStack>
              </Box>

              <Button
                colorScheme="warning"
                size="lg"
                onClick={handleRefund}
                isLoading={refundLoading}
                loadingText="Submitting..."
              >
                Claim Refund
              </Button>

              <Text fontSize="xs" color="text.tertiary" textAlign="center">
                Signed via your connected wallet
              </Text>
            </VStack>
          ) : (
            <VStack spacing={2} py={2} textAlign="center">
              <WarningIcon color="warning.400" boxSize={5} />
              <Text fontWeight="600" color="chakra-body-text" fontSize="sm">
                This campaign was cancelled
              </Text>
              <Text fontSize="xs" color="text.secondary">
                You didn&apos;t contribute to this campaign, so no refund is available.
              </Text>
            </VStack>
          )
        ) : successTxId ? (
          /* ── Donation success ── */
          <VStack spacing={4} py={2} textAlign="center">
            <Box
              w="52px"
              h="52px"
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
                  width="24"
                  height="24"
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

            <VStack spacing={0.5}>
              <Text fontWeight="700" fontSize="lg" color="chakra-body-text">
                Thank you!
              </Text>
              <Text fontSize="sm" color="text.secondary">
                {submittedDisplay}
              </Text>
              <Text
                fontSize="xs"
                color="text.tertiary"
                fontFamily="mono"
                mt={0.5}
              >
                {successTxId.slice(0, 8)}…{successTxId.slice(-8)}
              </Text>
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
                  width="100%"
                  onClick={handlePayFee}
                  isLoading={feeLoading}
                >
                  Pay {feeLabel} platform fee
                </Button>
              ) : feePaid ? (
                <Text fontSize="sm" color="success.600">
                  Platform fee paid ✓
                </Text>
              ) : null;
            })()}

            <Button
              colorScheme="primary"
              size="md"
              width="100%"
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
          <VStack spacing={4} align="stretch">
            <Heading size="sm" color="chakra-body-text">
              Support this campaign
            </Heading>

            <ButtonGroup isAttached w="100%" size="sm">
              <Button
                flex={1}
                colorScheme="primary"
                variant={paymentMethod === "stx" ? "solid" : "outline"}
                onClick={() => handleTokenChange("stx")}
              >
                STX
              </Button>
              <Button
                flex={1}
                colorScheme="primary"
                variant={paymentMethod === "sbtc" ? "solid" : "outline"}
                onClick={() => handleTokenChange("sbtc")}
              >
                sBTC
              </Button>
            </ButtonGroup>

            <SimpleGrid columns={4} spacing={1.5}>
              {PRESETS.map((amount) => (
                <Button
                  key={amount}
                  size="sm"
                  colorScheme="primary"
                  variant={selectedAmount === amount ? "solid" : "outline"}
                  onClick={() => handlePresetClick(amount)}
                  px={1}
                >
                  ${amount}
                </Button>
              ))}
            </SimpleGrid>

            <FormControl isInvalid={!!errorMsg}>
              <NumberInput
                min={0}
                value={customAmount}
                onChange={handleCustomChange}
                size="sm"
              >
                <NumberInputField
                  placeholder={`Custom ${paymentMethod.toUpperCase()} amount`}
                  fontSize="sm"
                />
              </NumberInput>
              {errorMsg && (
                <FormErrorMessage fontSize="xs">{errorMsg}</FormErrorMessage>
              )}
            </FormControl>

            {hint && (
              <Text
                fontSize="xs"
                color="text.secondary"
                textAlign="center"
                mt={-2}
              >
                {hint}
              </Text>
            )}

            <Button
              colorScheme="primary"
              size="lg"
              onClick={handleSubmit}
              isDisabled={(!selectedAmount && !customAmount) || isLoading}
              isLoading={isLoading}
              loadingText="Submitting..."
            >
              {ctaLabel}
            </Button>

            <Text fontSize="xs" color="text.tertiary" textAlign="center">
              Signed via your connected wallet
            </Text>
          </VStack>
        )}
      </CardBody>
    </Card>
  );
}
