"use client";

import { Fragment } from "react";
import {
  Box,
  Container,
  Flex,
  Link,
  HStack,
  IconButton,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  VStack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { isDevnetEnvironment } from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { DevnetWalletButton } from "./DevnetWalletButton";
import { ConnectWalletButton, useAddress } from "./ConnectWallet";

export const Navbar = () => {
  const { currentWallet, wallets, setCurrentWallet } = useDevnetWallet();
  const address = useAddress();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const navigationLinks = [
    { href: "/", label: "Campaigns" },
    ...(address ? [{ href: "/dashboard", label: "Dashboard" }] : []),
  ];

  return (
    <Box
      as="nav"
      aria-label="Global"
      bg="bg.nav"
      borderBottomWidth="1px"
      borderColor="border.default"
      position="sticky"
      top={0}
      zIndex={100}
      backdropFilter="blur(8px)"
    >
      <Container maxW="container.xl" px={{ base: 4, md: 8 }}>
        <Flex h={{ base: 16, md: 20 }} align="center" gap={3}>
          <Flex flex="1" minW={0}>
            <Link
              as={NextLink}
              href="/"
              _hover={{ textDecoration: "none" }}
              aria-label="FundStacks home page"
              px={2}
              py={1.5}
              borderRadius="interactive"
              _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" }}
            >
              <Text
                fontSize={{ base: "lg", md: "xl" }}
                fontFamily="mono"
                fontWeight="900"
                letterSpacing="0.08em"
                textTransform="uppercase"
                color="text.primary"
                lineHeight="1"
              >
                FundStacks
              </Text>
            </Link>
          </Flex>

          <HStack spacing={0} hideBelow="md" flex="1" justify="center">
            {navigationLinks.map((link, index) => (
              <Fragment key={link.href}>
                <Link
                  as={NextLink}
                  href={link.href}
                  color="text.secondary"
                  fontWeight="600"
                  fontSize="sm"
                  px={4}
                  py={2.5}
                  rounded="interactive"
                  _hover={{ color: "text.accent", bg: "bg.surfaceAlt", textDecoration: "none" }}
                  _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" }}
                >
                  {link.label}
                </Link>
                {index < navigationLinks.length - 1 ? (
                  <Box w="1px" h="4" bg="border.default" aria-hidden="true" />
                ) : null}
              </Fragment>
            ))}
          </HStack>

          <Flex flex="1" justify="flex-end" align="center" gap={{ base: 2, md: 3 }}>
            <Box hideBelow="md">
              {isDevnetEnvironment() ? (
                <DevnetWalletButton
                  currentWallet={currentWallet}
                  wallets={wallets}
                  onWalletSelect={setCurrentWallet}
                />
              ) : (
                <ConnectWalletButton />
              )}
            </Box>

            <IconButton
              aria-label="Open navigation menu"
              icon={<HamburgerIcon />}
              variant="ghost"
              hideFrom="md"
              onClick={onOpen}
              size="md"
            />
          </Flex>
        </Flex>
      </Container>

      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="xs">
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px" borderColor="border.default">
            Menu
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch" pt={6}>
              {isDevnetEnvironment() ? (
                <DevnetWalletButton
                  currentWallet={currentWallet}
                  wallets={wallets}
                  onWalletSelect={setCurrentWallet}
                  size="md"
                  w="100%"
                />
              ) : (
                <ConnectWalletButton size="md" w="100%">
                  Connect Wallet
                </ConnectWalletButton>
              )}

              <VStack as="nav" aria-label="Mobile" spacing={2} align="stretch">
                {navigationLinks.map((link) => (
                  <Link
                    key={link.href}
                    as={NextLink}
                    href={link.href}
                    color="text.primary"
                    fontWeight="600"
                    fontSize="md"
                    rounded="interactive"
                    px={3}
                    py={3}
                    _hover={{ color: "text.accent", bg: "bg.surfaceAlt", textDecoration: "none" }}
                    _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" }}
                    onClick={onClose}
                  >
                    {link.label}
                  </Link>
                ))}
              </VStack>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};
