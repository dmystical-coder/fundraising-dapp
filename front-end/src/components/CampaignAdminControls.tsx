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
  Box,
  Button,
  Checkbox,
  Heading,
  HStack,
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
import { CheckIcon, CloseIcon } from "@/components/icons";
import { useContext, useState, type ReactNode } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { getStacksNetworkString } from "@/lib/stacks-api";

const CARD = {
  bg: "bg.surface",
  borderColor: "border.default",
  borderWidth: "1px",
  borderRadius: "2xl",
  boxShadow: "0 1px 2px rgba(15,23,43,0.04)",
} as const;

function MicroLabel({
  children,
  color = "text.tertiary",
}: {
  children: ReactNode;
  color?: string;
}) {
  return (
    <Text
      fontSize="11px"
      fontWeight="700"
      letterSpacing="0.08em"
      textTransform="uppercase"
      color={color}
    >
      {children}
    </Text>
  );
}

type CampaignState = "active" | "ended" | "withdrawn" | "cancelled";

function StatusChip({ state }: { state: CampaignState }) {
  const map: Record<CampaignState, { label: string; bg: string; color: string }> = {
    active: { label: "Active", bg: "bg.accentSubtle", color: "text.accent" },
    ended: { label: "Ended", bg: "bg.surfaceAlt", color: "text.secondary" },
    withdrawn: { label: "Withdrawn", bg: "bg.successSubtle", color: "text.success" },
    cancelled: { label: "Cancelled", bg: "bg.errorSubtle", color: "text.danger" },
  };
  const s = map[state];
  return (
    <Box
      px={2.5}
      py={1}
      borderRadius="full"
      bg={s.bg}
      color={s.color}
      fontSize="11px"
      fontWeight="700"
      letterSpacing="0.06em"
      textTransform="uppercase"
      flexShrink={0}
    >
      {s.label}
    </Box>
  );
}

type NodeVariant = "done" | "current" | "upcoming" | "success" | "cancelled";

function StageNode({
  variant,
  label,
  sub,
  isLast = false,
  children,
}: {
  variant: NodeVariant;
  label: string;
  sub?: string;
  isLast?: boolean;
  children?: ReactNode;
}) {
  const visuals: Record<
    NodeVariant,
    { bg: string; border: string; icon: ReactNode; label: string; lit: boolean }
  > = {
    done: {
      bg: "primary.500",
      border: "primary.500",
      icon: <CheckIcon boxSize="9px" color="white" />,
      label: "text.primary",
      lit: true,
    },
    success: {
      bg: "success.500",
      border: "success.500",
      icon: <CheckIcon boxSize="9px" color="white" />,
      label: "success.700",
      lit: true,
    },
    current: {
      bg: "bg.surface",
      border: "primary.500",
      icon: <Box w="8px" h="8px" borderRadius="full" bg="primary.500" />,
      label: "primary.700",
      lit: false,
    },
    upcoming: {
      bg: "bg.surface",
      border: "border.default",
      icon: null,
      label: "text.tertiary",
      lit: false,
    },
    cancelled: {
      bg: "error.500",
      border: "error.500",
      icon: <CloseIcon boxSize="7px" color="white" />,
      label: "error.600",
      lit: false,
    },
  };
  const v = visuals[variant];

  return (
    <HStack align="stretch" spacing={3} minW={0}>
      <VStack spacing={0} align="center" flexShrink={0}>
        <Box
          w="26px"
          h="26px"
          borderRadius="full"
          borderWidth="2px"
          borderColor={v.border}
          bg={v.bg}
          display="flex"
          alignItems="center"
          justifyContent="center"
          boxShadow={variant === "current" ? "0 0 0 4px var(--chakra-colors-primary-50)" : undefined}
        >
          {v.icon}
        </Box>
        {!isLast && (
          <Box
            flex="1"
            w="2px"
            minH="16px"
            my="6px"
            bg={v.lit ? "primary.200" : "border.subtle"}
          />
        )}
      </VStack>

      <Box flex={1} minW={0} pb={isLast ? 0 : 5} pt="2px">
        <Text fontSize="sm" fontWeight="700" color={v.label}>
          {label}
        </Text>
        {sub && (
          <Text fontSize="sm" color="text.secondary" mt="2px">
            {sub}
          </Text>
        )}
        {children && <Box mt={3}>{children}</Box>}
      </Box>
    </HStack>
  );
}

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

  // Lifecycle state (derived) — drives the stepper.
  const state: CampaignState = campaignIsCancelled
    ? "cancelled"
    : campaignIsWithdrawn
    ? "withdrawn"
    : campaignIsExpired
    ? "ended"
    : "active";

  // Cancel is only available while the campaign is still running.
  const canCancel = state === "active";

  return (
    <>
      <Box
        p={5}
        {...CARD}
        role="region"
        aria-label="Campaign owner controls"
        aria-busy={isAnyActionPending}
      >
        <VStack align="stretch" spacing={5}>
          {campaignIsUninitialized ? (
            <>
              <Box>
                <Heading size="md" mb={1}>
                  Owner Controls
                </Heading>
                <Text fontSize="sm" color="text.secondary">
                  Set the goal and optional end date, then publish to open donations.
                </Text>
              </Box>

              <Box p={4} bg="bg.surfaceAlt" borderRadius="xl">
                <VStack align="stretch" spacing={3}>
                  <MicroLabel>Publish campaign</MicroLabel>

                  <NumberInput
                    bg="bg.field"
                    min={1}
                    value={goal}
                    onChange={handleGoalChange}
                    isDisabled={isAnyActionPending}
                  >
                    <NumberInputField placeholder="Enter goal (USD)" borderRadius="xl" />
                  </NumberInput>

                  <Input
                    bg="bg.field"
                    borderRadius="xl"
                    type="datetime-local"
                    value={endDateTimeLocal}
                    onChange={(e) => setEndDateTimeLocal(e.target.value)}
                    isDisabled={isAnyActionPending}
                  />

                  <Button
                    colorScheme="primary"
                    borderRadius="full"
                    fontWeight="700"
                    onClick={handleInitializeCampaign}
                    isDisabled={!goal || isAnyActionPending}
                    isLoading={isInitializingCampaign}
                    loadingText="Starting campaign"
                  >
                    Start campaign for ${Number(goal || 0).toLocaleString()}
                  </Button>
                </VStack>
              </Box>
            </>
          ) : (
            <>
              <HStack justify="space-between" align="flex-start" gap={3}>
                <Box>
                  <Heading size="md" mb={1}>
                    Owner Controls
                  </Heading>
                  <Text fontSize="sm" color="text.secondary">
                    Track where this campaign sits in its lifecycle.
                  </Text>
                </Box>
                <StatusChip state={state} />
              </HStack>

              {/* Lifecycle stepper */}
              <Box>
                <StageNode
                  variant="done"
                  label="Published"
                  sub="The campaign is live on-chain."
                />

                {state === "cancelled" ? (
                  <StageNode
                    variant="cancelled"
                    isLast
                    label="Cancelled"
                    sub="New donations are disabled and contributors can claim refunds."
                  />
                ) : (
                  <>
                    <StageNode
                      variant={state === "active" ? "current" : "done"}
                      label={state === "active" ? "Active" : "Ended"}
                      sub={
                        state === "active"
                          ? "Accepting donations until the campaign ends."
                          : "The campaign has reached its end."
                      }
                    />

                    <StageNode
                      variant={
                        state === "withdrawn"
                          ? "success"
                          : state === "ended"
                          ? "current"
                          : "upcoming"
                      }
                      isLast
                      label="Withdrawn"
                      sub={
                        state === "withdrawn"
                          ? "Funds have been settled to the beneficiary."
                          : state === "ended"
                          ? "Funds are ready to withdraw."
                          : "Available once the campaign ends."
                      }
                    >
                      {state === "ended" && (
                        <Button
                          colorScheme="primary"
                          borderRadius="full"
                          fontWeight="700"
                          size="sm"
                          onClick={() => setIsWithdrawConfirmationModalOpen(true)}
                          isDisabled={isAnyActionPending}
                          isLoading={isWithdrawingFunds}
                          loadingText="Withdrawing"
                        >
                          Withdraw funds
                        </Button>
                      )}
                    </StageNode>
                  </>
                )}
              </Box>

              {/* Off-path escape: cancel early (only while running) */}
              {canCancel && (
                <Box
                  pt={4}
                  borderTopWidth="1px"
                  borderTopColor="border.default"
                  borderStyle="dashed"
                >
                  <VStack align="stretch" spacing={2}>
                    <MicroLabel color="error.600">End early</MicroLabel>
                    <Text fontSize="sm" color="text.secondary">
                      Cancelling is irreversible and enables contributor refunds.
                    </Text>
                    <Button
                      alignSelf="flex-start"
                      variant="outline"
                      colorScheme="red"
                      borderRadius="full"
                      fontWeight="700"
                      size="sm"
                      onClick={() => setIsCancelConfirmationModalOpen(true)}
                      isDisabled={isAnyActionPending}
                      isLoading={isCancellingCampaign}
                      loadingText="Cancelling"
                    >
                      Cancel campaign
                    </Button>
                  </VStack>
                </Box>
              )}
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
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent borderRadius="2xl">
          <ModalHeader pb={1}>
            <MicroLabel color="error.600">Irreversible</MicroLabel>
            <Text mt={1}>Cancel Campaign?</Text>
          </ModalHeader>
          <ModalCloseButton borderRadius="full" />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text color="text.secondary">
                This action is irreversible. Contributors will become eligible for refunds, and the
                campaign will stop accepting new donations.
              </Text>
              <Checkbox
                colorScheme="red"
                isChecked={hasConfirmedCancel}
                onChange={(e) => setHasConfirmedCancel(e.target.checked)}
              >
                I understand and want to cancel this campaign.
              </Checkbox>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              borderRadius="full"
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
              borderRadius="full"
              fontWeight="700"
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
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
        <ModalContent borderRadius="2xl">
          <ModalHeader pb={1}>
            <MicroLabel color="text.accent">Settle campaign</MicroLabel>
            <Text mt={1}>Withdraw Funds?</Text>
          </ModalHeader>
          <ModalCloseButton borderRadius="full" />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Text color="text.secondary">
                Withdrawals should only be submitted when you are ready to settle this campaign.
                Please confirm to continue.
              </Text>
              <Checkbox
                colorScheme="primary"
                isChecked={hasConfirmedWithdraw}
                onChange={(e) => setHasConfirmedWithdraw(e.target.checked)}
              >
                I confirm I want to withdraw campaign funds.
              </Checkbox>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="ghost"
              borderRadius="full"
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
              borderRadius="full"
              fontWeight="700"
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
