import { useExistingDonation } from "@/hooks/campaignQueries";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Text,
  NumberInput,
  NumberInputField,
  HStack,
  VStack,
  RadioGroup,
  Radio,
  ModalFooter,
  FormControl,
  FormLabel,
  FormErrorMessage,
  usePrefersReducedMotion,
} from "@chakra-ui/react";
import { CheckIcon, ExternalLinkIcon } from "@chakra-ui/icons";
import React, { useState } from "react";
import { useContext } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import {
  executeContractCall,
  isDevnetEnvironment,
  isTestnetEnvironment,
  openContractCall,
} from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { ConnectWalletButton } from "./ConnectWallet";
import { DevnetWalletButton } from "./DevnetWalletButton";
import { buildFundstacksDonateTx } from "@/lib/fundstacks-sdk";
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

export default function DonationModal({
  isOpen,
  campaignId,
  campaignTitle,
  onClose,
}: {
  isOpen: boolean;
  campaignId: number | null;
  campaignTitle?: string;
  onClose: () => void;
}) {
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

  const { data: previousDonation } = useExistingDonation(
    currentWalletAddress,
    campaignId
  );
  const { data: prices } = useCurrentPrices();

  const hasMadePreviousDonation =
    previousDonation &&
    (previousDonation?.stxAmount > 0 || previousDonation?.sbtcAmount > 0);

  const [isLoading, setIsLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("stx");
  const [customAmount, setCustomAmount] = useState("");
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [successTxId, setSuccessTxId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const prefersReducedMotion = usePrefersReducedMotion();

  const presetAmounts = [10, 25, 50, 100];

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
    setErrorMsg(null);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setErrorMsg(null);
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    if (!campaignId) {
      toast.error("No active campaign", {
        description: "There is no active campaign to contribute to yet.",
        duration: 3000,
      });
      setIsLoading(false);
      return;
    }

    let txAmount: number = 0;

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
      const tokenAmount = Number(customAmount);
      if (!tokenAmount || tokenAmount <= 0) {
        setErrorMsg("Please enter a valid donation amount");
        setIsLoading(false);
        return;
      }
      if (paymentMethod === "stx" && tokenAmount < 1) {
        setErrorMsg("Please enter a minimum of 1 STX");
        setIsLoading(false);
        return;
      }
      txAmount =
        paymentMethod === "sbtc"
          ? Math.round(btcToSats(tokenAmount))
          : Math.round(Number(stxToUstx(tokenAmount)));
    }

    try {

      const txOptions = buildFundstacksDonateTx({
        campaignId: BigInt(campaignId),
        amount: BigInt(txAmount),
        asset: paymentMethod === "sbtc" ? "sbtc" : "stx",
        senderAddress: currentWalletAddress || "",
      });
      const resolvedNetwork = txOptions.network;
      const useDevnetExecution =
        resolvedNetwork === "devnet" || isDevnetEnvironment();

      const doSuccess = (txid: string) => {
        setSuccessTxId(txid);
        setIsLoading(false);

        // Invalidate queries so the UI updates without requiring a page refresh
        queryClient.invalidateQueries({ queryKey: ["indexer"] });
        if (campaignId) {
          queryClient.invalidateQueries({ queryKey: ["campaignInfo", campaignId] });
        }
        if (campaignId && currentWalletAddress) {
          queryClient.invalidateQueries({ queryKey: ["campaignDonations", campaignId, currentWalletAddress] });
        }
      };

      if (useDevnetExecution) {
        const { txid } = await executeContractCall(txOptions, devnetWallet);
        doSuccess(txid);
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: (data) => {
            doSuccess(data.txId);
          },
          onCancel: () => {
            toast.info("Cancelled", {
              description: "Transaction was cancelled",
              duration: 3000,
            });
            setIsLoading(false);
            onClose();
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
      onClose();
    }
  };

  const handleShare = async () => {
    const url = window.location.origin + `/campaigns/${campaignId}`;
    const text = `I just contributed to "${campaignTitle || 'a campaign'}" on Stacks! Join me in supporting this project.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "I just donated!",
          text: text,
          url: url,
        });
      } catch (err) {
        console.warn("Share failed", err);
      }
    } else {
      navigator.clipboard.writeText(`${text} ${url}`);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleReset = () => {
    setSuccessTxId(null);
    setCustomAmount("");
    setSelectedAmount(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={{ base: "full", md: "md" }}
      isCentered
      returnFocusOnClose
      motionPreset={prefersReducedMotion ? "none" : "scale"}
    >
      <ModalOverlay
        bg="blackAlpha.600"
        backdropFilter={prefersReducedMotion ? "none" : "blur(4px)"}
      />
      <ModalContent mx={4}>
        <ModalHeader>Make a Contribution</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb="8">
          <Flex direction="column" gap="3">
            {!currentWalletAddress ? (
              <Flex
                p={6}
                borderWidth="1px"
                borderRadius="lg"
                borderColor="border.default"
                align="center"
                justify="center"
                direction="column"
                gap="4"
              >
                <Box color="chakra-body-text">
                  Please connect a STX wallet to make a contribution.
                </Box>
                {isDevnetEnvironment() ? (
                  <DevnetWalletButton
                    currentWallet={devnetWallet}
                    wallets={devnetWallets}
                    onWalletSelect={setDevnetWallet}
                  />
                ) : (
                  <ConnectWalletButton />
                )}
              </Flex>
            ) : successTxId ? (
              <VStack spacing={6} py={8} textAlign="center">
                <Box color="success.500">
                  <svg
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </Box>
                <VStack spacing={2}>
                  <Text fontSize="2xl" fontWeight="bold" color="chakra-body-text">
                    Thank You!
                  </Text>
                  <Text color="text.secondary">
                    Your donation of {selectedAmount ? `$${selectedAmount}` : `${customAmount} ${paymentMethod.toUpperCase()}`} has been submitted.
                  </Text>
                  <Text fontSize="xs" color="text.tertiary">
                    TxID: {successTxId.slice(0, 8)}...{successTxId.slice(-8)}
                  </Text>
                </VStack>

                <Button
                  onClick={handleShare}
                  size="lg"
                  variant="solid"
                  colorScheme="primary"
                  width="100%"
                  leftIcon={<ExternalLinkIcon />}
                  rightIcon={<CheckIcon />}
                >
                  Share Contribution
                </Button>

                <Button variant="ghost" onClick={handleReset}>
                  Close
                </Button>
              </VStack>
            ) : (
              <>
                {hasMadePreviousDonation ? (
                  <Alert mb="4" status="success" borderRadius="lg">
                    <Box>
                      <AlertTitle>
                        Heads up: you&apos;ve contributed before. Thank you!
                      </AlertTitle>
                      <AlertDescription>
                        <Box>
                          STX:{" "}
                          {Number(
                            ustxToStx(previousDonation?.stxAmount)
                          ).toFixed(2)}
                        </Box>
                        <Box>
                          sBTC:{" "}
                          {satsToSbtc(previousDonation?.sbtcAmount).toFixed(8)}
                        </Box>
                      </AlertDescription>
                    </Box>
                  </Alert>
                ) : null}
                <Box mx="auto" w="100%" p={6} borderWidth="1px" borderRadius="lg" borderColor="border.default">
                  <VStack spacing={6} align="stretch">
                    <FormControl as="fieldset">
                      <FormLabel as="legend" fontSize="lg" fontWeight="bold" color="chakra-body-text">
                        Choose Payment Method
                      </FormLabel>
                      <RadioGroup
                        value={paymentMethod}
                        onChange={setPaymentMethod}
                      >
                        <HStack spacing={6}>
                          <Radio value="stx" colorScheme="primary">
                            STX
                          </Radio>
                          <Radio value="sbtc" colorScheme="primary">
                            sBTC
                          </Radio>
                        </HStack>
                      </RadioGroup>
                    </FormControl>

                    <Text fontSize="lg" fontWeight="bold" color="chakra-body-text">
                      Choose Contribution Amount
                    </Text>

                    <HStack spacing={3} justify="center" wrap="wrap">
                      {presetAmounts.map((amount) => (
                        <Button
                          key={amount}
                          size="lg"
                          variant={
                            selectedAmount === amount ? "solid" : "outline"
                          }
                          colorScheme="primary"
                          onClick={() => handlePresetClick(amount)}
                        >
                          ${amount}
                        </Button>
                      ))}
                    </HStack>

                    <FormControl isInvalid={!!errorMsg}>
                      <FormLabel htmlFor="custom-amount" fontSize="md" color="text.secondary">
                        Or enter custom amount in {paymentMethod.toUpperCase()}:
                      </FormLabel>
                      <NumberInput
                        id="custom-amount"
                        min={paymentMethod === "stx" ? 1 : 0}
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                      >
                        <NumberInputField
                          placeholder={`Enter ${paymentMethod.toUpperCase()} amount`}
                          textAlign="center"
                          fontSize="lg"
                        />
                      </NumberInput>
                      {errorMsg && (
                        <FormErrorMessage>{errorMsg}</FormErrorMessage>
                      )}
                    </FormControl>

                    <Flex direction="column" gap="1">
                      <Button
                        colorScheme="primary"
                        size="lg"
                        onClick={handleSubmit}
                        isDisabled={
                          (!selectedAmount && !customAmount) || isLoading
                        }
                        isLoading={isLoading}
                      >
                        Donate {selectedAmount ? `$${selectedAmount}` : customAmount ? `${customAmount} ${paymentMethod.toUpperCase()}` : "$0"}
                      </Button>
                      <Box mx="auto" fontSize="sm" fontWeight="bold" color="text.secondary">
                        {selectedAmount ? (
                          `(≈ ${paymentMethod === "stx"
                            ? `${usdToStx(selectedAmount, prices?.stx || 0).toFixed(2)} STX`
                            : `${usdToSbtc(selectedAmount, prices?.sbtc || 0).toFixed(8)} sBTC`})`
                        ) : customAmount ? (
                          `(≈ $${(Number(customAmount) * (paymentMethod === "stx" ? (prices?.stx || 0) : (prices?.sbtc || 0))).toFixed(2)})`
                        ) : (
                          `(≈ 0 STX)`
                        )}
                      </Box>
                    </Flex>
                  </VStack>
                </Box>
              </>
            )}
          </Flex>
        </ModalBody>
        {!successTxId && (
          <ModalFooter>
             <Button variant="ghost" onClick={onClose}>Close</Button>
          </ModalFooter>
        )}
      </ModalContent>
    </Modal>
  );
}
