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
} from "@chakra-ui/react";
import { useContext } from "react";
import HiroWalletContext from "./HiroWalletProvider";
import {
  isDevnetEnvironment,
  isMainnetEnvironment,
  isTestnetEnvironment,
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

  if (isDevnetEnvironment()) {
    return currentWallet?.stxAddress || null;
  }

  if (isTestnetEnvironment()) {
    return testnetAddress || null;
  }

  if (isMainnetEnvironment()) {
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

  const currentAddress = isTestnetEnvironment()
    ? testnetAddress
    : isMainnetEnvironment()
    ? mainnetAddress
    : null;

  const networkLabel = isTestnetEnvironment()
    ? "testnet"
    : isMainnetEnvironment()
    ? "mainnet"
    : undefined;

  const { onCopy } = useClipboard(currentAddress || "");

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
      onClick={authenticate}
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

