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
  Flex,
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
  Tooltip,
} from "@chakra-ui/react";
import { useContext, useState } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { getStacksNetworkString } from "@/lib/stacks-api";
import { getApi, getStacksUrl } from "@/lib/stacks-api";
import { FUNDRAISING_CONTRACT } from "@/constants/contracts";
import { cvToHex, cvToJSON, hexToCV, uintCV } from "@stacks/transactions";

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
    const api = getApi(getStacksUrl()).smartContractsApi;

    const response = await api.callReadOnlyFunction({
      contractAddress: FUNDRAISING_CONTRACT.address || "",
      contractName: FUNDRAISING_CONTRACT.name,
      functionName: "get-campaign-info",
      readOnlyFunctionArgs: {
        sender: FUNDRAISING_CONTRACT.address || "",
        arguments: [cvToHex(uintCV(id))],
      },
    });

    if (!response?.okay || !response?.result) {
      throw new Error(response?.cause || "Error fetching campaign totals");
    }

    const result = cvToJSON(hexToCV(response.result));
    if (!result?.success) {
      throw new Error("Error decoding campaign totals");
    }

    const totalStxUstx = BigInt(result?.value?.value?.totalStx?.value ?? "0");
    const totalSbtcSats = BigInt(result?.value?.value?.totalSbtc?.value ?? "0");

    return { totalStxUstx, totalSbtcSats };
  };

  const { mainnetAddress, testnetAddress } = useContext(HiroWalletContext);
  const { currentWallet: devnetWallet } = useDevnetWallet();
  const currentWalletAddress = isDevnetEnvironment()
    ? devnetWallet?.stxAddress
    : isTestnetEnvironment()
    ? testnetAddress
    : mainnetAddress;

  const [isInitializingCampaign, setIsInitializingCampaign] = useState(false);
  const [isCancelConfirmationModalOpen, setIsCancelConfirmationModalOpen] =
    useState(false);

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
    await executeTx(
      txOptions,
      devnetWallet,
      "Campaign was initialized",
      "Campaign was not initialized"
    );
    setGoal("");
    setEndDateTimeLocal("");
    setIsInitializingCampaign(true);
  };

  const handleCancel = async () => {
    if (!campaignId) return;
    setIsCancelConfirmationModalOpen(false);
    const txOptions = getCancelTx(
      getStacksNetworkString(),
      currentWalletAddress || "",
      campaignId
    );
    await executeTx(
      txOptions,
      devnetWallet,
      "Campaign cancellation was requested",
      "Campaign was not cancelled"
    );
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
    await executeTx(
      txOptions,
      devnetWallet,
      "Withdraw requested",
      "Withdraw not requested"
    );
  };

  return (
    <>
      <Alert mb="4" colorScheme="gray">
        <Box>
          <AlertTitle mb="2">This is your campaign.</AlertTitle>
          <AlertDescription>
            <Flex direction="column" gap="2">
              {campaignIsUninitialized ? (
                isInitializingCampaign ? (
                  <Box>
                    Initializing campaign, please wait for it to be confirmed
                    on-chain...
                  </Box>
                ) : (
                  <>
                    <Box mb="1">
                      Do you want to start it now? It will be open for
                      contributions and will run for about 30 days by default.
                    </Box>
                    <NumberInput
                      bg="white"
                      min={1}
                      value={goal}
                      onChange={handleGoalChange}
                    >
                      <NumberInputField
                        placeholder="Enter goal (USD)"
                        textAlign="center"
                        fontSize="lg"
                      />
                    </NumberInput>

                    <Input
                      bg="white"
                      type="datetime-local"
                      value={endDateTimeLocal}
                      onChange={(e) => setEndDateTimeLocal(e.target.value)}
                    />
                    <Button
                      colorScheme="green"
                      onClick={handleInitializeCampaign}
                      isDisabled={!goal}
                    >
                      Start campaign for ${Number(goal).toLocaleString()}
                    </Button>
                  </>
                )
              ) : (
                <Flex direction="column">
                  {/* Cancelled campaign - cannot withdraw or cancel */}
                  {campaignIsCancelled ? (
                    <Box>
                      You have cancelled this campaign. Contributions are
                      eligible for a refund.
                    </Box>
                  ) : (
                    // Uncancelled campaign - controls to withdraw or cancel
                    <Flex direction="column" gap="2">
                      {campaignIsExpired ? ( // Withdrawal controls are only displayed for expired campaigns
                        <>
                          {campaignIsWithdrawn ? (
                            <Box>
                              You have already withdrawn the funds. Good luck!
                            </Box>
                          ) : (
                            <Button
                              colorScheme="green"
                              onClick={handleWithdraw}
                            >
                              Withdraw funds
                            </Button>
                          )}
                        </>
                      ) : null}
                      <Tooltip label="If you cancel the campaign, all contributions will be refunded to the donors, and this campaign will no longer accept new donations.">
                        <Button
                          colorScheme="yellow"
                          onClick={() => {
                            setIsCancelConfirmationModalOpen(true);
                          }}
                        >
                          Cancel campaign
                        </Button>
                      </Tooltip>
                    </Flex>
                  )}
                </Flex>
              )}
            </Flex>
          </AlertDescription>
        </Box>
      </Alert>
      <Modal
        isOpen={isCancelConfirmationModalOpen}
        onClose={() => {
          setIsCancelConfirmationModalOpen(false);
        }}
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Cancel Campaign?</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            This campaign will be cancelled. All contributors will be eligible
            for a refund, and you will not be able to collect the funds. This
            campaign will not accept new donations.
          </ModalBody>
          <ModalFooter>
            <Button
              onClick={() => {
                setIsCancelConfirmationModalOpen(false);
              }}
              mr="3"
            >
              Nevermind
            </Button>
            <Button colorScheme="blue" onClick={handleCancel}>
              Yes, End Campaign
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
