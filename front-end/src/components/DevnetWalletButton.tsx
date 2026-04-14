"use client";

import {
  Button,
  ButtonProps,
  Flex,
  Tag,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";
import { DevnetWallet } from "@/lib/devnet-wallet-context";
import { formatStxAddress } from "@/lib/address-utils";
import { DEVNET_STACKS_BLOCKCHAIN_API_URL } from "@/constants/devnet";

interface DevnetWalletButtonProps {
  currentWallet: DevnetWallet | null;
  wallets: DevnetWallet[];
  onWalletSelect: (wallet: DevnetWallet) => void;
  size?: ButtonProps["size"];
  w?: ButtonProps["w"];
}

export const DevnetWalletButton = ({
  currentWallet,
  wallets,
  onWalletSelect,
  size = "sm",
  w,
}: DevnetWalletButtonProps) => {
  const currentAddress = currentWallet?.stxAddress || "";
  const explorerLink = `https://explorer.hiro.so/address/${currentAddress}?chain=testnet&api=${DEVNET_STACKS_BLOCKCHAIN_API_URL}`;

  return (
    <Menu placement="bottom-end">
      <MenuButton
        as={Button}
        size={size}
        w={w}
        justifyContent="space-between"
        rightIcon={<ChevronDownIcon />}
        data-testid="wallet-connect-button"
        aria-label="Open devnet wallet menu"
      >
        <Flex align="center" gap={2} minW={0}>
          <Text
            fontSize="sm"
            fontFamily="mono"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {formatStxAddress(currentAddress)}
          </Text>
          <Tag size="sm" borderRadius="full" bg="whiteAlpha.300" color="text.inverse">
            devnet
          </Tag>
        </Flex>
      </MenuButton>
      <MenuList minW="240px">
        <MenuItem
          as="a"
          href={explorerLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          View in Explorer
        </MenuItem>
        {wallets.map((wallet) => (
          <MenuItem
            key={wallet.stxAddress}
            onClick={() => onWalletSelect(wallet)}
            bg={
              wallet.stxAddress === currentWallet?.stxAddress
                ? "bg.accentSubtle"
                : "none"
            }
          >
            <Flex align="center" gap={2}>
              <Text
                fontSize="sm"
                fontFamily="mono"
                width="150px"
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                {formatStxAddress(wallet.stxAddress)}
              </Text>
              {wallet.label && (
                <Tag size="sm" colorScheme="gray" borderRadius="full">
                  {wallet.label}
                </Tag>
              )}
            </Flex>
          </MenuItem>
        ))}
      </MenuList>
    </Menu>
  );
};
