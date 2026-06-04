"use client";

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
  Button,
  VStack,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import { isDevnetEnvironment } from "@/lib/contract-utils";
import { useDevnetWallet } from "@/lib/devnet-wallet-context";
import { DevnetWalletButton } from "./DevnetWalletButton";
import { ConnectWalletButton } from "./ConnectWallet";
import { FundStacksMark } from "./common/FundStacksMark";

const focusRing = {
  _focusVisible: { boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" },
};

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/docs", label: "Docs" },
];

export const Navbar = () => {
  const { currentWallet, wallets, setCurrentWallet } = useDevnetWallet();
  const pathname = usePathname();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const isActiveLink = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);

  const Wordmark = (
    <Link
      as={NextLink}
      href="/"
      _hover={{ textDecoration: "none" }}
      aria-label="Home - FundStacks"
      px={1}
      borderRadius="interactive"
      display="inline-flex"
      alignItems="center"
      gap={2.5}
      {...focusRing}
    >
      <FundStacksMark size={32} />
      <Text
        display={{ base: "none", sm: "block" }}
        fontSize={{ base: "lg", md: "xl" }}
        fontFamily="mono"
        fontWeight="900"
        letterSpacing="0.08em"
        textTransform="uppercase"
        color="primary.700"
        lineHeight="1"
        whiteSpace="nowrap"
      >
        FundStacks
      </Text>
    </Link>
  );

  return (
    <Box
      as="nav"
      aria-label="Global"
      position="sticky"
      top={0}
      zIndex={100}
      px={{ base: 3, md: 6 }}
      pt={{ base: 3, md: 4 }}
      pb={{ base: 3, md: 4 }}
    >
      <Container maxW="container.xl" px={0}>
        <Flex
          h={{ base: 14, md: 16 }}
          align="center"
          gap={3}
          bg="bg.nav"
          backdropFilter="blur(12px)"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius="2xl"
          boxShadow="card"
          px={{ base: 3, md: 5 }}
        >
          {/* Left — wordmark */}
          <Flex flex="1" minW={0} align="center">
            {Wordmark}
          </Flex>

          {/* Center — segmented pill control */}
          <HStack
            spacing={1}
            hideBelow="lg"
            bg="bg.surfaceAlt"
            borderRadius="full"
            p={1}
            borderWidth="1px"
            borderColor="border.subtle"
          >
            {NAV_LINKS.map((link) => {
              const active = isActiveLink(link.href);
              return (
                <Link
                  key={link.href}
                  as={NextLink}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  px={4}
                  py={2}
                  borderRadius="full"
                  fontSize="sm"
                  fontWeight={active ? "700" : "600"}
                  color={active ? "text.accent" : "text.secondary"}
                  bg={active ? "bg.surface" : "transparent"}
                  boxShadow={active ? "0 1px 2px rgba(15,23,43,0.08)" : "none"}
                  transition="all 0.15s ease"
                  _hover={{
                    textDecoration: "none",
                    color: "text.accent",
                    bg: active ? "bg.surface" : "whiteAlpha.700",
                  }}
                  {...focusRing}
                >
                  {link.label}
                </Link>
              );
            })}
          </HStack>

          {/* Right — primary CTA + wallet */}
          <Flex flex="1" justify="flex-end" align="center" gap={{ base: 2, md: 3 }}>
            <Button
              as={NextLink}
              href="/campaigns/new"
              hideBelow="lg"
              size="md"
              colorScheme="primary"
              borderRadius="full"
              fontWeight="700"
              color="text.inverse"
              _hover={{ textDecoration: "none", color: "text.inverse", bg: "primary.600" }}
              _active={{ bg: "primary.700" }}
              {...focusRing}
            >
              Start a campaign
            </Button>

            <Box hideBelow="lg">
              {isDevnetEnvironment() ? (
                <DevnetWalletButton
                  currentWallet={currentWallet}
                  wallets={wallets}
                  onWalletSelect={setCurrentWallet}
                  size="md"
                />
              ) : (
                <ConnectWalletButton
                  size="md"
                  variant="outline"
                  colorScheme="primary"
                  borderRadius="full"
                />
              )}
            </Box>

            {/* Mobile — profile (account menu) */}
            <Box hideFrom="lg">
              {isDevnetEnvironment() ? (
                <DevnetWalletButton
                  currentWallet={currentWallet}
                  wallets={wallets}
                  onWalletSelect={setCurrentWallet}
                  size="sm"
                />
              ) : (
                <ConnectWalletButton compact size="md" />
              )}
            </Box>

            {/* Mobile — nav menu */}
            <IconButton
              aria-label="Open navigation menu"
              icon={<HamburgerIcon boxSize={7} />}
              variant="ghost"
              borderRadius="full"
              boxSize="36px"
              minW="36px"
              hideFrom="lg"
              onClick={onOpen}
            />
          </Flex>
        </Flex>
      </Container>

      {/* Mobile drawer */}
      <Drawer isOpen={isOpen} placement="right" onClose={onClose}>
        <DrawerOverlay />
        <DrawerContent maxW="xs" borderLeftRadius="2xl">
          <DrawerHeader borderBottomWidth="1px" borderColor="border.default">
            <Flex align="center" justify="space-between">
              <Text>Menu</Text>
              <DrawerCloseButton position="static" />
            </Flex>
          </DrawerHeader>
          <DrawerBody>
            <VStack spacing={5} align="stretch" pt={5}>
              <VStack as="nav" aria-label="Mobile" spacing={2} align="stretch">
                {NAV_LINKS.map((link) => {
                  const active = isActiveLink(link.href);
                  return (
                    <Link
                      key={link.href}
                      as={NextLink}
                      href={link.href}
                      color={active ? "text.accent" : "text.primary"}
                      fontWeight={active ? "700" : "600"}
                      fontSize="md"
                      rounded="interactive"
                      px={3}
                      py={3}
                      aria-current={active ? "page" : undefined}
                      bg={active ? "bg.accentSubtle" : "transparent"}
                      borderWidth={active ? "1px" : "0"}
                      borderColor={active ? "border.accent" : "transparent"}
                      _hover={{ color: "text.accent", bg: "bg.surfaceAlt", textDecoration: "none" }}
                      onClick={onClose}
                      {...focusRing}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </VStack>

              <Button
                as={NextLink}
                href="/campaigns/new"
                colorScheme="primary"
                borderRadius="full"
                size="lg"
                fontWeight="700"
                color="text.inverse"
                _hover={{ textDecoration: "none", color: "text.inverse", bg: "primary.600" }}
                _active={{ bg: "primary.700" }}
                onClick={onClose}
                {...focusRing}
              >
                Start a campaign
              </Button>
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  );
};
