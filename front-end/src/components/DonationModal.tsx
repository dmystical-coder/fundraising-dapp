import { useExistingDonation } from "@/hooks/campaignQueries";
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
  useToast,
  HStack,
  VStack,
  RadioGroup,
  Radio,
  ModalFooter,
} from "@chakra-ui/react";
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
import { getContributeSbtcTx, getContributeStxTx } from "@/lib/campaign-utils";
import { getStacksNetworkString } from "@/lib/stacks-api";
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
  const toast = useToast();

  const presetAmounts = [10, 25, 50, 100];

  const handlePresetClick = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount("");
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
  };

  const handleSubmit = async () => {
    setIsLoading(true);

    if (!campaignId) {
      toast({
        title: "No active campaign",
        description: "There is no active campaign to contribute to yet.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      setIsLoading(false);
      return;
    }

    const amount = selectedAmount || Number(customAmount);

    if (!amount || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid donation amount",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      const txOptions =
        paymentMethod === "sbtc"
          ? getContributeSbtcTx(getStacksNetworkString(), {
              address: currentWalletAddress || "",
              campaignId,
              amount: Math.round(
                btcToSats(usdToSbtc(amount, prices?.sbtc || 0))
              ),
            })
          : getContributeStxTx(getStacksNetworkString(), {
              address: currentWalletAddress || "",
              campaignId,
              amount: Math.round(
                Number(stxToUstx(usdToStx(amount, prices?.stx || 0)))
              ),
            });

      const doSuccess = (txid: string) => {
        setSuccessTxId(txid);
        setIsLoading(false);
        toast({
          title: "Donation Submitted! Thank you!",
          description: (
            <Flex direction="column" gap="4">
              <Box>Processing donation of ${amount}.</Box>
              <Box fontSize="xs">
                Transaction ID: <strong>{txid}</strong>
              </Box>
            </Flex>
          ),
          status: "success",
          isClosable: true,
          duration: 30000,
        });
      };

      if (isDevnetEnvironment()) {
        const { txid } = await executeContractCall(txOptions, devnetWallet);
        doSuccess(txid);
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: (data) => {
            doSuccess(data.txId);
          },
          onCancel: () => {
            toast({
              title: "Cancelled",
              description: "Transaction was cancelled",
              status: "info",
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
      toast({
        title: "Error",
        description: "Failed to make contribution",
        status: "error",
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
      toast({ title: "Link copied to clipboard!", status: "success" });
    }
  };

  const handleReset = () => {
    setSuccessTxId(null);
    setCustomAmount("");
    setSelectedAmount(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" isCentered>
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
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
                borderColor="warm.border"
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
                  <Text color="gray.600">
                    Your donation of ${selectedAmount || customAmount} has been submitted.
                  </Text>
                  <Text fontSize="xs" color="gray.400">
                    TxID: {successTxId.slice(0, 8)}...{successTxId.slice(-8)}
                  </Text>
                </VStack>

                <Button
                  onClick={handleShare}
                  size="lg"
                  colorScheme="primary"
                  width="100%"
                  leftIcon={<span>📣</span>}
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
                  <Alert mb="4" status="info" borderRadius="lg">
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
                <Box mx="auto" w="100%" p={6} borderWidth="1px" borderRadius="lg" borderColor="warm.border">
                  <VStack spacing={6} align="stretch">
                    <Text fontSize="lg" fontWeight="bold" color="chakra-body-text">
                      Choose Payment Method
                    </Text>

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

                    <Text fontSize="md" color="gray.500" _dark={{ color: "gray.400" }}>Or enter custom amount:</Text>

                    <NumberInput
                      min={1}
                      value={customAmount}
                      onChange={handleCustomAmountChange}
                    >
                      <NumberInputField
                        placeholder="Enter amount"
                        textAlign="center"
                        fontSize="lg"
                      />
                    </NumberInput>

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
                        Donate ${selectedAmount || customAmount || "0"}
                      </Button>
                      <Box mx="auto" fontSize="sm" fontWeight="bold" color="gray.500" _dark={{ color: "gray.400" }}>
                        (≈
                        {paymentMethod === "stx"
                          ? `${usdToStx(
                              Number(selectedAmount || customAmount || "0"),
                              prices?.stx || 0
                            ).toFixed(2)} STX`
                          : `${usdToSbtc(
                              Number(selectedAmount || customAmount || "0"),
                              prices?.sbtc || 0
                            ).toFixed(8)} sBTC`}
                        )
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
