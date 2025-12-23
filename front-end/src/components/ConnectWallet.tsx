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
  isMainnetEnvironment,
  isTestnetEnvironment,
} from "@/lib/contract-utils";
import { formatStxAddress } from "@/lib/address-utils";

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
