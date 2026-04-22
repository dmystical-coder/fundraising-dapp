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

// ─── Link data ────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Explore Campaigns", href: "/campaigns" },
  { label: "Create Campaign", href: "/campaigns/new" },
];

const ECOSYSTEM_LINKS = [
  { label: "Stacks", href: "https://stacks.co" },
  { label: "Hiro Explorer", href: "https://explorer.hiro.so" },
  { label: "Hiro Wallet", href: "https://wallet.hiro.so" },
  { label: "sBTC Docs", href: "https://docs.stacks.co/concepts/sbtc" },
];

// ─── ExternalLinkIcon (inline SVG — no icon dep needed) ──────────────────────

function ExternalIcon() {
  return (
    <Box
      as="svg"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 12"
      w="10px"
      h="10px"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      display="inline-block"
      ml="3px"
      verticalAlign="middle"
      opacity={0.6}
      flexShrink={0}
      aria-hidden="true"
    >
      <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7" />
      <polyline points="8 1 11 1 11 4" />
      <line x1="5" y1="7" x2="11" y2="1" />
    </Box>
  );
}

// ─── Column heading ───────────────────────────────────────────────────────────

function ColHeading({ children }: { children: React.ReactNode }) {
  return (
    <Text
      fontSize="11px"
      fontWeight="700"
      letterSpacing="0.1em"
      textTransform="uppercase"
      color="text.tertiary"
      mb={3}
    >
      {children}
    </Text>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function AppFooter() {
  const year = new Date().getFullYear();

  return (
    <Box
      as="footer"
      aria-label="Site footer"
      bg="bg.surface"
      borderTopWidth="1px"
      borderColor="border.default"
    >
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
                _hover={{ textDecoration: "none", opacity: 0.85 }}
                _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)", borderRadius: "sm" }}
              >
                <Text
                  fontSize="lg"
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
              <Text fontSize="sm" color="text.secondary" lineHeight="1.65">
                Raise funds in STX and sBTC. Transparent, on-chain crowdfunding
                built on the Stacks blockchain — secured by Bitcoin.
              </Text>
              {/* Trust markers */}
              <HStack spacing={3} pt={1} flexWrap="wrap" gap={2}>
                {["On-chain", "Non-custodial", "Open source"].map((label) => (
                  <Box
                    key={label}
                    px={2.5}
                    py={1}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor="border.default"
                    bg="bg.surfaceAlt"
                  >
                    <Text
                      fontSize="10px"
                      fontWeight="600"
                      letterSpacing="0.05em"
                      textTransform="uppercase"
                      color="text.tertiary"
                    >
                      {label}
                    </Text>
                  </Box>
                ))}
              </HStack>
            </VStack>
          </GridItem>

          {/* Navigate */}
          <GridItem>
            <ColHeading>Navigate</ColHeading>
            <VStack align="flex-start" spacing={2.5}>
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  as={NextLink}
                  href={link.href}
                  fontSize="sm"
                  color="text.secondary"
                  _hover={{ color: "text.accent", textDecoration: "none" }}
                  _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)", borderRadius: "sm" }}
                >
                  {link.label}
                </Link>
              ))}
            </VStack>
          </GridItem>

          {/* Ecosystem */}
          <GridItem>
            <ColHeading>Ecosystem</ColHeading>
            <VStack align="flex-start" spacing={2.5}>
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
                  _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)", borderRadius: "sm" }}
                >
                  {link.label}
                  <ExternalIcon />
                </Link>
              ))}
            </VStack>
          </GridItem>
        </Grid>

        <Divider borderColor="border.default" />

        {/* Bottom bar */}
        <HStack
          justify="space-between"
          align="center"
          py={5}
          flexWrap="wrap"
          gap={3}
        >
          <Text fontSize="xs" color="text.tertiary">
            &copy; {year} FundStacks. All rights reserved.
          </Text>
          
        </HStack>
      </Container>
    </Box>
  );
}

export default AppFooter;
