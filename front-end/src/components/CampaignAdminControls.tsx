import useTransactionExecuter from "@/hooks/useTransactionExecuter";
import {
  getCancelTx,
  getCreateCampaignTx,
  getWithdrawTx,
} from "@/lib/campaign-utils";
import {
  isDevnetEnvironment,
  isTestnetEnvironment,
} from "@/lib/contract-utils";
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Box,
  Button,
  Checkbox,
  Heading,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useContext, useState } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { getStacksNetworkString } from "@/lib/stacks-api";

export default function CampaignAdminControls({
  campaignId,
  campaignIsUninitialized,
  campaignIsCancelled,
  campaignIsExpired,
  campaignIsWithdrawn,
  totalStx,
  totalSbtc,
}: {
  campaignId: number | null;
  campaignIsUninitialized: boolean;
  campaignIsCancelled: boolean;
  campaignIsExpired: boolean;
  campaignIsWithdrawn: boolean;
  totalStx?: number;
  totalSbtc?: number;
}) {
  const fetchLatestCampaignTotals = async (id: number) => {
    const res = await fetch(`/api/campaigns/${id}`, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to fetch campaign totals: ${res.status}`);
    const { campaign } = await res.json();
    return {
      totalStxUstx: BigInt(campaign.total_stx ?? "0"),
      totalSbtcSats: BigInt(campaign.total_sbtc ?? "0"),
    };
  };

  const { mainnetAddress, testnetAddress } = useContext(HiroWalletContext);
  const { currentWallet: devnetWallet } = useDevnetWallet();
  const currentWalletAddress = isDevnetEnvironment()
    ? devnetWallet?.stxAddress
    : isTestnetEnvironment()
    ? testnetAddress
    : mainnetAddress;

  const [isCancelConfirmationModalOpen, setIsCancelConfirmationModalOpen] = useState(false);
  const [isWithdrawConfirmationModalOpen, setIsWithdrawConfirmationModalOpen] = useState(false);
  const [isInitializingCampaign, setIsInitializingCampaign] = useState(false);
  const [isCancellingCampaign, setIsCancellingCampaign] = useState(false);
  const [isWithdrawingFunds, setIsWithdrawingFunds] = useState(false);
  const [hasConfirmedCancel, setHasConfirmedCancel] = useState(false);
  const [hasConfirmedWithdraw, setHasConfirmedWithdraw] = useState(false);

  const executeTx = useTransactionExecuter();
  const [goal, setGoal] = useState("");
  const [endDateTimeLocal, setEndDateTimeLocal] = useState("");
  const handleGoalChange = (value: string) => {
    setGoal(value);
  };

  const handleInitializeCampaign = async () => {
    const endAt = endDateTimeLocal
      ? Math.floor(new Date(endDateTimeLocal).getTime() / 1000)
      : 0;

    const txOptions = getCreateCampaignTx(
      getStacksNetworkString(),
      currentWalletAddress || "",
      Number(goal),
      endAt,
      currentWalletAddress || ""
    );
    setIsInitializingCampaign(true);
    try {
      await executeTx(
        txOptions,
        devnetWallet,
        "Campaign was initialized",
        "Campaign was not initialized"
      );
      setGoal("");
      setEndDateTimeLocal("");
    } finally {
      setIsInitializingCampaign(false);
    }
  };

  const handleCancel = async () => {
    if (!campaignId) return;
    setIsCancelConfirmationModalOpen(false);
    setHasConfirmedCancel(false);
    const txOptions = getCancelTx(
      getStacksNetworkString(),
      currentWalletAddress || "",
      campaignId
    );
    setIsCancellingCampaign(true);
    try {
      await executeTx(
        txOptions,
        devnetWallet,
        "Campaign cancellation was requested",
        "Campaign was not cancelled"
      );
    } finally {
      setIsCancellingCampaign(false);
    }
  };

  const handleWithdraw = async () => {
    if (!campaignId) return;

    let totalsToUse: {
      totalStxUstx: bigint | number;
      totalSbtcSats: bigint | number;
    };
    try {
      totalsToUse = await fetchLatestCampaignTotals(campaignId);
    } catch (error) {
      // Fall back to last-known totals if chain read fails.
      console.error(error);
      totalsToUse = {
        totalStxUstx: totalStx ?? 0,
        totalSbtcSats: totalSbtc ?? 0,
      };
    }

    const txOptions = getWithdrawTx(
      getStacksNetworkString(),
      currentWalletAddress || "",
      campaignId,
      totalsToUse
    );
    setIsWithdrawingFunds(true);
    try {
      await executeTx(
        txOptions,
        devnetWallet,
        "Withdraw requested",
        "Withdraw not requested"
      );
    } finally {
      setIsWithdrawingFunds(false);
      setHasConfirmedWithdraw(false);
      setIsWithdrawConfirmationModalOpen(false);
    }
  };

  const isAnyActionPending =
    isInitializingCampaign || isCancellingCampaign || isWithdrawingFunds;

  const cancelDisabledReason = campaignIsCancelled
    ? "This campaign is already cancelled."
    : campaignIsExpired
    ? "You cannot cancel a campaign after it has ended."
    : campaignIsWithdrawn
    ? "This campaign has already been withdrawn."
    : null;

  const withdrawDisabledReason = campaignIsWithdrawn
    ? "Funds are already withdrawn."
    : campaignIsCancelled
    ? "Cancelled campaigns cannot be withdrawn."
    : !campaignIsExpired
    ? "Withdrawal becomes available after the campaign ends."
    : null;

  return (
    <>
      <Box
        p={5}
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="xl"
        bg="bg.surface"
        role="region"
        aria-label="Campaign owner controls"
        aria-busy={isAnyActionPending}
      >
        <VStack align="stretch" spacing={4}>
          <Box>
            <Heading size="md" mb={1}>
              Owner Controls
            </Heading>
            <Text fontSize="sm" color="text.secondary">
              Manage campaign lifecycle actions safely. Destructive actions require confirmation.
            </Text>
          </Box>

          {campaignIsUninitialized ? (
            <Box
              p={4}
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="lg"
              bg="bg.surfaceAlt"
            >
              <VStack align="stretch" spacing={3}>
                <Box>
                  <Text fontWeight="600" color="chakra-body-text">
                    Publish campaign
                  </Text>
                  <Text fontSize="sm" color="text.secondary">
                    Set the goal and optional end date before opening donations.
                  </Text>
                </Box>

                <NumberInput
                  bg="bg.field"
                  min={1}
                  value={goal}
                  onChange={handleGoalChange}
                  isDisabled={isAnyActionPending}
                >
                  <NumberInputField placeholder="Enter goal (USD)" />
                </NumberInput>

                <Input
                  bg="bg.field"
                  type="datetime-local"
                  value={endDateTimeLocal}
                  onChange={(e) => setEndDateTimeLocal(e.target.value)}
                  isDisabled={isAnyActionPending}
                />

                <Button
                  colorScheme="primary"
                  onClick={handleInitializeCampaign}
                  isDisabled={!goal || isAnyActionPending}
                  isLoading={isInitializingCampaign}
                  loadingText="Starting campaign"
                >
                  Start campaign for ${Number(goal || 0).toLocaleString()}
                </Button>
              </VStack>
            </Box>
          ) : (
            <>
              {campaignIsCancelled && (
                <Alert status="warning" borderRadius="lg">
                  <Box>
                    <AlertTitle fontSize="sm">Campaign cancelled</AlertTitle>
                    <AlertDescription fontSize="sm">
                      Contributors can now claim refunds, and new donations are disabled.
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              {campaignIsWithdrawn && (
                <Alert status="success" borderRadius="lg">
                  <Box>
                    <AlertTitle fontSize="sm">Funds withdrawn</AlertTitle>
                    <AlertDescription fontSize="sm">
                      Withdrawal has already been submitted for this campaign.
                    </AlertDescription>
                  </Box>
                </Alert>
              )}

              <Box
                p={4}
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="lg"
                bg="bg.surfaceAlt"
              >
                <VStack align="stretch" spacing={3}>
                  <Box>
                    <Text fontWeight="600" color="chakra-body-text">
                      Withdraw raised funds
                    </Text>
                    <Text fontSize="sm" color="text.secondary">
                      Available once the campaign has ended and has not been cancelled.
                    </Text>
                  </Box>
                  <Button
                    colorScheme="primary"
                    onClick={() => setIsWithdrawConfirmationModalOpen(true)}
                    isDisabled={!!withdrawDisabledReason || isAnyActionPending}
                    isLoading={isWithdrawingFunds}
                    loadingText="Withdrawing"
                  >
                    Withdraw funds
                  </Button>
                  {withdrawDisabledReason && (
                    <Text fontSize="sm" color="text.tertiary">
                      {withdrawDisabledReason}
                    </Text>
                  )}
                </VStack>
              </Box>

              <Box
                p={4}
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="lg"
                bg="bg.surfaceAlt"
              >
                <VStack align="stretch" spacing={3}>
                  <Box>
                    <Text fontWeight="600" color="chakra-body-text">
                      Cancel campaign
                    </Text>
                    <Text fontSize="sm" color="text.secondary">
                      Cancellation is irreversible and enables contributor refunds.
                    </Text>
                  </Box>
                  <Button
                    colorScheme="red"
                    variant="outline"
                    onClick={() => setIsCancelConfirmationModalOpen(true)}
                    isDisabled={!!cancelDisabledReason || isAnyActionPending}
                    isLoading={isCancellingCampaign}
                    loadingText="Cancelling"
                  >
                    Cancel campaign
                  </Button>
                  {cancelDisabledReason && (
                    <Text fontSize="sm" color="text.tertiary">
                      {cancelDisabledReason}
                    </Text>
                  )}
                </VStack>
              </Box>
            </>
          )}
        </VStack>
      </Box>

      <Modal
        isOpen={isCancelConfirmationModalOpen}
        onClose={() => {
          setIsCancelConfirmationModalOpen(false);
          setHasConfirmedCancel(false);
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cancel Campaign?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text>
                This action is irreversible. Contributors will become eligible for refunds, and the
                campaign will stop accepting new donations.
              </Text>
              <Checkbox
                isChecked={hasConfirmedCancel}
                onChange={(e) => setHasConfirmedCancel(e.target.checked)}
              >
                I understand and want to cancel this campaign.
              </Checkbox>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => {
                setIsCancelConfirmationModalOpen(false);
                setHasConfirmedCancel(false);
              }}
              mr="3"
            >
              Nevermind
            </Button>
            <Button
              colorScheme="red"
              onClick={handleCancel}
              isDisabled={!hasConfirmedCancel}
              isLoading={isCancellingCampaign}
              loadingText="Cancelling"
            >
              Yes, End Campaign
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal
        isOpen={isWithdrawConfirmationModalOpen}
        onClose={() => {
          setIsWithdrawConfirmationModalOpen(false);
          setHasConfirmedWithdraw(false);
        }}
        isCentered
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Withdraw Funds?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text>
                Withdrawals should only be submitted when you are ready to settle this campaign.
                Please confirm to continue.
              </Text>
              <Checkbox
                isChecked={hasConfirmedWithdraw}
                onChange={(e) => setHasConfirmedWithdraw(e.target.checked)}
              >
                I confirm I want to withdraw campaign funds.
              </Checkbox>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => {
                setIsWithdrawConfirmationModalOpen(false);
                setHasConfirmedWithdraw(false);
              }}
              mr="3"
            >
              Back
            </Button>
            <Button
              colorScheme="primary"
              onClick={handleWithdraw}
              isDisabled={!hasConfirmedWithdraw}
              isLoading={isWithdrawingFunds}
              loadingText="Withdrawing"
            >
              Confirm Withdraw
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
