"use client";

import {
  Box,
  Container,
  Flex,
  Link,
  HStack,
  Button,
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
import { AddIcon, HamburgerIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { isDevnetEnvironment } from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { DevnetWalletButton } from "./DevnetWalletButton";
import { ConnectWalletButton, useAddress } from "./ConnectWallet";

export const Navbar = () => {
  const { currentWallet, wallets, setCurrentWallet } = useDevnetWallet();
  const address = useAddress();
  const { isOpen, onOpen, onClose } = useDisclosure();

  return (
    <Box
      as="nav"
      bg="rgba(255, 255, 255, 0.9)"
      _dark={{ bg: "rgba(26, 32, 44, 0.9)" }}
      borderBottomWidth="1px"
      borderColor="chakra-border-color"
      position="sticky"
      top={0}
      zIndex={100}
      backdropFilter="blur(8px)"
    >
      <Container maxW="container.xl">
        <Flex justify="space-between" h={16} align="center">
          {/* Logo */}
          <HStack spacing={6}>
            <Link
              as={NextLink}
              href="/"
              _hover={{ textDecoration: "none" }}
              aria-label="FundStacks — Go to homepage"
            >
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
                <Box display={{ base: "none", sm: "block" }}>
                  <Text
                    fontSize="lg"
                    fontWeight="bold"
                    color="chakra-body-text"
                    lineHeight="1.2"
                  >
                    FundStacks
                  </Text>
                  <Text fontSize="xs" color="gray.500" lineHeight="1">
                    Crowdfunding on Stacks
                  </Text>
                </Box>
              </HStack>
            </Link>

            {/* Desktop Navigation Links */}
            <HStack spacing={4} display={{ base: "none", md: "flex" }}>
              <Link
                as={NextLink}
                href="/"
                color="gray.600"
                _dark={{ color: "gray.400" }}
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
                  _dark={{ color: "gray.400" }}
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
              colorScheme="primary"
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
            
            {/* Mobile hamburger menu */}
            <IconButton
              aria-label="Open menu"
              icon={<HamburgerIcon />}
              variant="ghost"
              display={{ base: "flex", md: "none" }}
              onClick={onOpen}
            />
          </HStack>
        </Flex>
      </Container>

      {/* Mobile drawer menu */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader borderBottomWidth="1px">Menu</DrawerHeader>
          <DrawerBody>
            <VStack spacing={4} align="stretch" pt={4}>
              <Link
                as={NextLink}
                href="/"
                color="chakra-body-text"
                fontWeight="500"
                fontSize="lg"
                _hover={{ color: "primary.600" }}
                onClick={onClose}
              >
                Campaigns
              </Link>
              {address && (
                <Link
                  as={NextLink}
                  href="/dashboard"
                  color="chakra-body-text"
                  fontWeight="500"
                  fontSize="lg"
                  _hover={{ color: "primary.600" }}
                  onClick={onClose}
                >
                  Dashboard
                </Link>
              )}
              <Button
                as={NextLink}
                href="/campaigns/new"
                leftIcon={<AddIcon />}
                colorScheme="primary"
                onClick={onClose}
              >
                Create Campaign
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};
