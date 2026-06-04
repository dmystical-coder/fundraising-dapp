import {
  ContractCallOptions,
  executeContractCall,
  isDevnetEnvironment,
  openContractCall,
} from "@/lib/contract-utils";
import { DevnetWallet } from "@/lib/devnet-wallet-context";
import { Box, Flex } from "@chakra-ui/react";
import { toast } from "sonner";

// Execute a stx transaction on-chain from the client.
// For devnet, it directly calls the transaction.
// For mainnet/testnet, it requests signing from the browser wallet extension
export default function useTransactionExecuter() {


  return async (
    txOptions: ContractCallOptions,
    devnetWallet: DevnetWallet | null,
    successMessage: string,
    errorMessage: string
  ) => {
    const doSuccessToast = (txid: string) => {
      toast.success(successMessage, {
        description: (
          <Flex direction="column" gap="4">
            <Box fontSize="xs">
              Transaction ID: <strong>{txid}</strong>
            </Box>
          </Flex>
        ),
        duration: 30000,
      });
    };

    try {
      // Devnet uses direct call, Testnet/Mainnet needs to prompt with browser extension
      if (isDevnetEnvironment()) {
        const { txid } = await executeContractCall(txOptions, devnetWallet);
        doSuccessToast(txid);
      } else {
        await openContractCall({
          ...txOptions,
          onFinish: (data) => {
            doSuccessToast(data.txId);
          },
          onCancel: () => {
            toast.info("Cancelled", {
              description: "No problem — nothing was sent.",
              duration: 3000,
            });
          },
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("That didn't go through", {
        description: errorMessage,
      });
      return false;
    }
  };
}
