import {
  Box,
  Container,
  Divider,
  Grid,
  GridItem,
  HStack,
  Link,
  Text,
  VStack,
} from "@chakra-ui/react";
import NextLink from "next/link";
import { FundStacksMark } from "./common/FundStacksMark";
import { ArrowUpRightIcon, GithubIcon } from "./icons";

// ─── Link data ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Explore Campaigns", href: "/campaigns" },
  { label: "Create Campaign", href: "/campaigns/new" },
  { label: "Docs", href: "/docs" },
];

const ECOSYSTEM_LINKS = [
  { label: "Stacks", href: "https://stacks.co" },
  { label: "Hiro Explorer", href: "https://explorer.hiro.so" },
  { label: "Hiro Wallet", href: "https://wallet.hiro.so" },
  { label: "sBTC Docs", href: "https://docs.stacks.co/concepts/sbtc" },
];

const GITHUB_URL = "https://github.com/dmystical-coder/fundraising-dapp";

// ─── Column heading ───────────────────────────────────────────────────────────

function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="11px"
      fontWeight="700"
      letterSpacing="0.1em"
      textTransform="uppercase"
      color="text.tertiary"
      mb={4}
    >
      {children}
    </Text>
  );
}

const focusRing = {
  _focusVisible: { boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)", borderRadius: "sm" },
};

// ─── Footer ───────────────────────────────────────────────────────────────────

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <Box as="footer" aria-label="Site footer" bg="bg.surface">
      {/* Brand gradient accent (mirrors the logo mark) */}
      <Box
        h="2px"
        bgGradient="linear(to-r, primary.500, secondary.500)"
        aria-hidden="true"
      />
      <Container maxW="container.xl" px={{ base: 4, md: 8 }}>
        {/* Upper section */}
        <Grid
          templateColumns={{ base: "1fr", md: "2fr 1fr", lg: "2.5fr 1fr 1fr" }}
          gap={{ base: 10, md: 8 }}
          py={{ base: 12, md: 14 }}
        >
          {/* Brand */}
          <GridItem>
            <VStack align="flex-start" spacing={4} maxW={{ base: "100%", lg: "360px" }}>
              <Link
                as={NextLink}
                href="/"
                display="inline-flex"
                alignItems="center"
                gap={2.5}
                _hover={{ textDecoration: "none", opacity: 0.85 }}
                {...focusRing}
              >
                <FundStacksMark size={28} />
                <Text
                  fontSize="lg"
                  fontFamily="mono"
                  fontWeight="900"
                  letterSpacing="0.08em"
                  textTransform="uppercase"
                  color="primary.700"
                  lineHeight="1"
                >
                  FundStacks
                </Text>
              </Link>
              <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
                Fund what matters, together. Raise or give in STX and sBTC —
                transparent, on-chain, and secured by Bitcoin.
              </Text>
            </VStack>
          </GridItem>

          {/* Navigate */}
          <GridItem>
            <ColHeading>Navigate</ColHeading>
            <VStack align="flex-start" spacing={3}>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  as={NextLink}
                  href={link.href}
                  fontSize="sm"
                  color="text.secondary"
                  _hover={{ color: "text.accent", textDecoration: "none" }}
                  {...focusRing}
                >
                  {link.label}
                </Link>
              ))}
            </VStack>
          </GridItem>

          {/* Ecosystem */}
          <GridItem>
            <ColHeading>Ecosystem</ColHeading>
            <VStack align="flex-start" spacing={3}>
              {ECOSYSTEM_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  isExternal
                  fontSize="sm"
                  color="text.secondary"
                  display="inline-flex"
                  alignItems="center"
                  _hover={{ color: "text.accent", textDecoration: "none" }}
                  {...focusRing}
                >
                  {link.label}
                  <ArrowUpRightIcon boxSize="12px" ml="3px" opacity={0.6} flexShrink={0} aria-hidden="true" />
                </Link>
              ))}
            </VStack>
          </GridItem>
        </Grid>

        <Divider borderColor="border.default" />

        {/* Bottom bar */}
        <HStack justify="space-between" align="center" py={6} flexWrap="wrap" gap={4}>
          <Text fontSize="xs" color="text.tertiary">
            &copy; {year} FundStacks. All rights reserved.
          </Text>
          <Link
            href={GITHUB_URL}
            isExternal
            aria-label="FundStacks on GitHub"
            color="text.tertiary"
            display="inline-flex"
            borderRadius="full"
            p={1}
            _hover={{ color: "text.accent" }}
            {...focusRing}
          >
            <GithubIcon boxSize="18px" />
          </Link>
        </HStack>
      </Container>
    </Box>
  );
}

export default AppFooter;
