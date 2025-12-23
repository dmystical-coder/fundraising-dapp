import {
  executeContractCall,
  isDevnetEnvironment,
  openContractCall,
} from "@/lib/contract-utils";
import { DevnetWallet } from "@/lib/devnet-wallet-context";
import { Box, Flex, useToast } from "@chakra-ui/react";
import { ContractCallRegularOptions } from "@stacks/connect";

// Execute a stx transaction on-chain from the client.
// For devnet, it directly calls the transaction.
// For mainnet/testnet, it requests signing from the browser wallet extension
export default function useTransactionExecuter() {
  const toast = useToast();

  return async (
    txOptions: ContractCallRegularOptions,
    devnetWallet: DevnetWallet | null,
    successMessage: string,
    errorMessage: string
  ) => {
    const doSuccessToast = (txid: string) => {
      toast({
        title: successMessage,
        description: (
          <Flex direction="column" gap="4">
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
            toast({
              title: "Transaction not submitted",
              description: "Transaction was cancelled",
              status: "info",
              duration: 3000,
            });
          },
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
      });
      return false;
    }
  };
}
