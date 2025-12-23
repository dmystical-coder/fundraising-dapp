"use client";
import {
  Button,
  ButtonProps,
  Flex,
  Tag,
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
  const { authenticate } = useContext(HiroWalletContext);
  const { isWalletConnected, mainnetAddress, testnetAddress } =
    useContext(HiroWalletContext);

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

  return (
    <Button
      size="sm"
      data-testid="wallet-connect-button"
      onClick={authenticate}
      {...buttonProps}
    >
      <Flex gap="2" align="center">
        {isWalletConnected && currentAddress ? (
          <>
            {formatStxAddress(currentAddress)}
            {networkLabel ? (
              <Tag size="sm" colorScheme="gray" borderRadius="full">
                {networkLabel}
              </Tag>
            ) : null}
          </>
        ) : (
          children || "Connect Wallet"
        )}
      </Flex>
    </Button>
  );
};
