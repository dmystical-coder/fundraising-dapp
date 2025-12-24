"use client";

import { HStack, Text, TextProps, IconButton, Tooltip, Link } from "@chakra-ui/react";
import { CopyIcon, ExternalLinkIcon, CheckIcon } from "@chakra-ui/icons";
import { useState, useCallback } from "react";

interface AddressDisplayProps extends Omit<TextProps, "children"> {
  address: string;
  truncate?: boolean;
  truncateLength?: number;
  showCopy?: boolean;
  showExplorer?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: { fontSize: "xs", buttonSize: "xs", iconSize: 3 },
  md: { fontSize: "sm", buttonSize: "sm", iconSize: 4 },
  lg: { fontSize: "md", buttonSize: "md", iconSize: 5 },
};

/**
 * Returns the Stacks Explorer URL for an address.
 */
function getExplorerUrl(address: string): string {
  const network = process.env.NEXT_PUBLIC_STACKS_NETWORK || "mainnet";
  const baseUrl =
    network === "mainnet"
      ? "https://explorer.stacks.co/address"
      : network === "testnet"
      ? "https://explorer.stacks.co/address"
      : "http://localhost:3999/extended/v1/address";

  const suffix = network === "testnet" ? "?chain=testnet" : "";
  return `${baseUrl}/${address}${suffix}`;
}

/**
 * Truncates an address to show start and end portions.
 */
function truncateAddress(address: string, length: number = 8): string {
  if (address.length <= length * 2 + 3) return address;
  return `${address.slice(0, length)}...${address.slice(-length)}`;
}

/**
 * Displays a principal address with copy and explorer link functionality.
 */
export function AddressDisplay({
  address,
  truncate = true,
  truncateLength = 6,
  showCopy = true,
  showExplorer = true,
  size = "md",
  ...props
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false);
  const styles = sizeStyles[size];

  const displayAddress = truncate
    ? truncateAddress(address, truncateLength)
    : address;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy address:", err);
    }
  }, [address]);

  return (
    <HStack spacing={1} align="center">
      <Tooltip label={address} hasArrow placement="top">
        <Text
          fontFamily="mono"
          fontSize={styles.fontSize}
          color="gray.600"
          {...props}
        >
          {displayAddress}
        </Text>
      </Tooltip>

      {showCopy && (
        <Tooltip label={copied ? "Copied!" : "Copy address"} hasArrow>
          <IconButton
            aria-label="Copy address"
            icon={copied ? <CheckIcon color="success.500" /> : <CopyIcon />}
            size={styles.buttonSize}
            variant="ghost"
            onClick={handleCopy}
            minW="auto"
            h="auto"
            p={1}
          />
        </Tooltip>
      )}

      {showExplorer && (
        <Tooltip label="View in Explorer" hasArrow>
          <IconButton
            as={Link}
            href={getExplorerUrl(address)}
            isExternal
            aria-label="View in Explorer"
            icon={<ExternalLinkIcon />}
            size={styles.buttonSize}
            variant="ghost"
            minW="auto"
            h="auto"
            p={1}
          />
        </Tooltip>
      )}
    </HStack>
  );
}

/**
 * Simple truncated address display without interactive features.
 */
interface SimpleAddressProps extends Omit<TextProps, "children"> {
  address: string;
  length?: number;
}

export function SimpleAddress({
  address,
  length = 6,
  ...props
}: SimpleAddressProps) {
  return (
    <Tooltip label={address} hasArrow placement="top">
      <Text fontFamily="mono" color="gray.600" {...props}>
        {truncateAddress(address, length)}
      </Text>
    </Tooltip>
  );
}

export default AddressDisplay;
