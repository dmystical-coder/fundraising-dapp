"use client";
import {
  Button,
  ButtonProps,
  Flex,
  Menu,
  MenuButton,
  MenuItem,
  MenuList,
  Tag,
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { useContext } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import {
  getConfiguredStacksNetwork,
  isDevnetEnvironment,
} from "@/lib/contract-utils";
import { formatStxAddress } from "@/lib/address-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";

/**
 * Hook to get the current connected wallet address.
 * Works for both devnet (manual wallet selection) and mainnet/testnet (Hiro wallet).
 */
export const useAddress = (): string | null => {
  const { mainnetAddress, testnetAddress } = useContext(HiroWalletContext);
  const { currentWallet } = useDevnetWallet();
  const network = getConfiguredStacksNetwork();

  if (isDevnetEnvironment()) {
    return currentWallet?.stxAddress || null;
  }

  if (network === "testnet") {
    return testnetAddress || null;
  }

  if (network === "mainnet") {
    return mainnetAddress || null;
  }

  return null;
};

interface ConnectWalletButtonProps extends ButtonProps {
  children?: React.ReactNode;
}

export const ConnectWalletButton = (buttonProps: ConnectWalletButtonProps) => {
  const { children } = buttonProps;
  const {
    authenticate,
    disconnect,
    isWalletConnected,
    mainnetAddress,
    testnetAddress,
  } = useContext(HiroWalletContext);

  const network = getConfiguredStacksNetwork();
  const currentAddress =
    network === "testnet"
      ? testnetAddress
      : network === "mainnet"
      ? mainnetAddress
      : null;

  const networkLabel =
    network === "testnet" || network === "mainnet" ? network : undefined;

  const { onCopy } = useClipboard(currentAddress || "");
  const toast = useToast();

  const handleAuthenticate = async () => {
    try {
      await authenticate();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const isProviderConflict =
        /Cannot redefine property:\s*StacksProvider/i.test(message);
      toast({
        title: "Wallet connection failed",
        description: isProviderConflict
          ? "Multiple Stacks wallet extensions are conflicting. Disable one of Leather/Xverse and try again."
          : "Unable to connect wallet. Ensure a Stacks wallet extension is installed and unlocked, then retry.",
        status: "error",
        duration: 7000,
        isClosable: true,
      });
    }
  };

  if (isWalletConnected && currentAddress) {
    const restButtonProps = { ...buttonProps };
    delete (restButtonProps as { onClick?: unknown }).onClick;

    return (
      <Menu placement="bottom-end">
        <MenuButton
          as={Button}
          size="sm"
          data-testid="wallet-connect-button"
          {...restButtonProps}
        >
          <Flex gap="2" align="center">
            {formatStxAddress(currentAddress)}
            {networkLabel ? (
              <Tag size="sm" colorScheme="gray" borderRadius="full">
                {networkLabel}
              </Tag>
            ) : null}
          </Flex>
        </MenuButton>
        <MenuList>
          <MenuItem onClick={onCopy}>Copy address</MenuItem>
          <MenuItem onClick={disconnect}>Disconnect</MenuItem>
        </MenuList>
      </Menu>
    );
  }

  return (
    <Button
      size="sm"
      data-testid="wallet-connect-button"
      onClick={handleAuthenticate}
      {...buttonProps}
    >
      <Flex gap="2" align="center">
        {children || "Connect Wallet"}
      </Flex>
    </Button>
  );
};

// Alias for convenience
export const ConnectWallet = ConnectWalletButton;

