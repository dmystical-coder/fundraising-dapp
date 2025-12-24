"use client";

import { Box, Container, Flex, Link, HStack, Button } from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { isDevnetEnvironment } from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { DevnetWalletButton } from "./DevnetWalletButton";
import { ConnectWalletButton, useAddress } from "./ConnectWallet";

export const Navbar = () => {
  const { currentWallet, wallets, setCurrentWallet } = useDevnetWallet();
  const address = useAddress();

  return (
    <Box as="nav" bg="warm.surface" borderBottomWidth="1px" borderColor="warm.border">
      <Container maxW="container.xl">
        <Flex justify="space-between" h={16} align="center">
          {/* Logo */}
          <HStack spacing={6}>
            <Link as={NextLink} href="/" _hover={{ textDecoration: "none" }}>
              <HStack spacing={3}>
                <Flex
                  bg="primary.500"
                  borderRadius="lg"
                  fontSize="lg"
                  fontWeight="bold"
                  w="44px"
                  h="44px"
                  justify="center"
                  align="center"
                  color="white"
                  shrink={0}
                >
                  FS
                </Flex>
                <Box 
                  fontSize="lg" 
                  fontWeight="bold" 
                  color="gray.800"
                  fontFamily="var(--font-dm-sans), 'DM Sans', sans-serif"
                  display={{ base: "none", sm: "block" }}
                >
                  FundStacks
                </Box>
              </HStack>
            </Link>

            {/* Navigation Links */}
            <HStack spacing={4} display={{ base: "none", md: "flex" }}>
              <Link
                as={NextLink}
                href="/"
                color="gray.600"
                fontWeight="500"
                _hover={{ color: "primary.600" }}
              >
                Campaigns
              </Link>
              {address && (
                <Link
                  as={NextLink}
                  href="/dashboard"
                  color="gray.600"
                  fontWeight="500"
                  _hover={{ color: "primary.600" }}
                >
                  Dashboard
                </Link>
              )}
            </HStack>
          </HStack>

          {/* Right side */}
          <HStack spacing={3}>
            <Button
              as={NextLink}
              href="/campaigns/new"
              size="sm"
              leftIcon={<AddIcon />}
              bg="primary.500"
              color="white"
              _hover={{ bg: "primary.600", color: "white" }}
              _active={{ bg: "primary.700" }}
              display={{ base: "none", sm: "flex" }}
            >
              Create
            </Button>
            {isDevnetEnvironment() ? (
              <DevnetWalletButton
                currentWallet={currentWallet}
                wallets={wallets}
                onWalletSelect={setCurrentWallet}
              />
            ) : (
              <ConnectWalletButton />
            )}
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};

