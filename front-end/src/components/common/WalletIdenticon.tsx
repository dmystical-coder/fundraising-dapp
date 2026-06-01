"use client";

import { useMemo } from "react";
import { Box } from "@chakra-ui/react";
import makeBlockie from "ethereum-blockies-base64";

interface WalletIdenticonProps {
  address: string;
  size?: number;
}

/**
 * Deterministic blockies identicon for a wallet address. Works with any seed
 * string (incl. Stacks `SP…` addresses), rendered as a round avatar.
 */
export function WalletIdenticon({ address, size = 20 }: WalletIdenticonProps) {
  const uri = useMemo(() => (address ? makeBlockie(address) : ""), [address]);
  if (!uri) return null;
  return (
    <Box
      as="img"
      src={uri}
      alt=""
      aria-hidden="true"
      boxSize={`${size}px`}
      borderRadius="full"
      flexShrink={0}
      bg="bg.surfaceAlt"
    />
  );
}

export default WalletIdenticon;
