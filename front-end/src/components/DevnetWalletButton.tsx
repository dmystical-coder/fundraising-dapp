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
  MenuGroup,
  MenuDivider,
  Text,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@/components/icons";
import NextLink from "next/link";
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
            color="text.primary"
          >
            {formatStxAddress(currentAddress)}
          </Text>
          <Tag
            size="sm"
            borderRadius="full"
            colorScheme="orange"
            variant="subtle"
          >
            devnet
          </Tag>
        </Flex>
      </MenuButton>
      <MenuList minW="240px" zIndex="popover">
        <MenuItem as={NextLink} href="/dashboard" minH="11">
          Dashboard
        </MenuItem>
        <MenuDivider />
        <MenuGroup
          title="Local devnet (testing)"
          fontSize="xs"
          color="text.tertiary"
        >
          <MenuItem
            as="a"
            href={explorerLink}
            target="_blank"
            rel="noopener noreferrer"
            minH="11"
          >
            View in Explorer
          </MenuItem>
          {wallets.map((wallet) => (
            <MenuItem
              key={wallet.stxAddress}
              onClick={() => onWalletSelect(wallet)}
              minH="11"
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
        </MenuGroup>
      </MenuList>
    </Menu>
  );
};
