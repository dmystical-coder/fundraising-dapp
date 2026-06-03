"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  Stack,
  VStack,
  HStack,
  Badge,
  AspectRatio,
} from "@chakra-ui/react";
import Link from "next/link";
import { WalletIdenticon } from "@/components/common/WalletIdenticon";

// ─── Illustrative campaign snapshot ──────────────────────────────────────────
// Decorative only: mirrors the real CampaignCard's visual language so the hero
// shows the product, but it is sample content (aria-hidden, non-interactive).
function HeroPreviewCard() {
  return (
    <Box
      aria-hidden="true"
      w={{ base: "100%", lg: "420px" }}
      maxW={{ base: "420px", lg: "420px" }}
    >
      <Box
        bg="bg.surface"
        borderRadius="2xl"
        borderWidth="1px"
        borderColor="border.default"
        boxShadow="card"
        overflow="hidden"
      >
        {/* Cover */}
        <Box position="relative">
          <AspectRatio ratio={16 / 9}>
            <Box
              bg="bg.surfaceAlt"
              backgroundImage="radial-gradient(var(--chakra-colors-primary-200) 1px, transparent 1px)"
              backgroundSize="20px 20px"
              opacity={0.85}
            />
          </AspectRatio>
          <Box position="absolute" top={3} left={3}>
            <Badge
              colorScheme="green"
              variant="subtle"
              borderRadius="full"
              textTransform="uppercase"
              fontWeight="600"
              letterSpacing="0.05em"
              px={2}
              py={0.5}
              fontSize="2xs"
              boxShadow="0 1px 3px rgba(15,23,43,0.18)"
            >
              Active
            </Badge>
          </Box>
        </Box>

        <VStack align="stretch" spacing={4} p={5}>
          <Heading size="md" color="text.primary" lineHeight="1.35">
            Clean Water Initiative
          </Heading>

          <HStack spacing={2}>
            <Text
              fontSize="11px"
              fontWeight="700"
              letterSpacing="0.08em"
              textTransform="uppercase"
              color="text.tertiary"
            >
              To
            </Text>
            <WalletIdenticon address="SP6KCLEANWATER000DEMO000SNAPSHOT00PBD8" size={22} />
            <Text fontSize="sm" fontFamily="mono" color="text.secondary">
              SP6K…PBD8
            </Text>
          </HStack>

          {/* Funding block */}
          <VStack
            spacing={4}
            align="stretch"
            p={4}
            bg="bg.accentSubtle"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="border.accent"
          >
            <Box>
              <Text
                fontSize="11px"
                fontWeight="700"
                letterSpacing="0.08em"
                textTransform="uppercase"
                color="text.tertiary"
              >
                Raised
              </Text>
              <HStack spacing={2} align="baseline" mt={1}>
                <Text fontFamily="mono" fontWeight="600" color="primary.600">
                  12.4
                </Text>
                <Text fontSize="sm" color="text.secondary">
                  STX
                </Text>
                <Text fontSize="sm" color="text.tertiary">
                  ($2.7K)
                </Text>
              </HStack>
            </Box>
            <Box>
              <HStack justify="space-between" mb={1.5}>
                <Text
                  fontSize="11px"
                  fontWeight="700"
                  letterSpacing="0.08em"
                  textTransform="uppercase"
                  color="text.tertiary"
                >
                  Progress
                </Text>
                <Text fontSize="xs" fontWeight="700" color="primary.700">
                  68%
                </Text>
              </HStack>
              <Box
                w="100%"
                h="6px"
                borderRadius="full"
                bg="bg.surfaceAlt"
                borderWidth="1px"
                borderColor="border.default"
                overflow="hidden"
              >
                <Box w="68%" h="100%" borderRadius="full" bg="primary.500" />
              </Box>
            </Box>
          </VStack>

          <HStack justify="space-between" align="center">
            <Text fontSize="sm" color="text.secondary">
              <Text as="span" fontWeight="700" color="text.primary">
                42
              </Text>{" "}
              donors
            </Text>
            <Box
              px={4}
              py={1.5}
              borderRadius="full"
              bg="primary.500"
              color="text.inverse"
              fontSize="sm"
              fontWeight="700"
            >
              Donate
            </Box>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
}

export function HeroSection() {
  return (
    <Box
      position="relative"
      overflow="hidden"
      bg="bg.canvas"
      py={{ base: 6, md: 9, lg: 12 }}
    >
      <Box
        aria-hidden="true"
        position="absolute"
        top={{ base: "-44px", md: "-72px" }}
        right={{ base: "-84px", md: "-32px" }}
        w={{ base: "180px", md: "280px" }}
        h={{ base: "180px", md: "280px" }}
        bg="bg.accentSubtle"
        borderRadius="full"
        filter="blur(24px)"
        opacity={0.65}
      />
      <Box
        aria-hidden="true"
        position="absolute"
        bottom={{ base: "-100px", md: "-120px" }}
        left={{ base: "-92px", md: "-40px" }}
        w={{ base: "220px", md: "300px" }}
        h={{ base: "220px", md: "300px" }}
        bg="bg.surfaceAlt"
        borderRadius="full"
        filter="blur(30px)"
        opacity={0.75}
      />

      <Container maxW="container.xl" px={{ base: 4, md: 8 }} position="relative" zIndex={1}>
        <Stack
          direction={{ base: "column", lg: "row" }}
          spacing={{ base: 8, md: 10, lg: 12 }}
          align="center"
          justify="space-between"
          minH={{ base: "auto", lg: "420px" }}
        >
          <VStack align={{ base: "center", lg: "flex-start" }} textAlign={{ base: "center", lg: "left" }} spacing={5} flex="1">
            <Badge
              colorScheme="primary"
              variant="subtle"
              px={3}
              py={1}
              borderRadius="full"
              textTransform="none"
              fontWeight="600"
              bg="bg.accentSubtle"
              color="text.accent"
            >
              Transparent crowdfunding on Stacks
            </Badge>

            <Heading
              as="h1"
              fontSize={{ base: "2xl", md: "4xl", lg: "5xl", xl: "6xl" }}
              color="text.primary"
              fontWeight="800"
              lineHeight="1.1"
              letterSpacing="-0.02em"
              maxW={{ base: "16ch", lg: "18ch" }}
            >
              Raise and discover campaigns with{" "}
              <Text as="span" color="primary.500">
                STX
              </Text>{" "}
              and{" "}
              <Text as="span" color="warning.500">
                sBTC
              </Text>
            </Heading>

            <Text fontSize={{ base: "md", md: "xl" }} color="text.secondary" maxW="48ch" lineHeight="1.65">
              FundStacks helps supporters find credible causes quickly and gives creators a straightforward
              path to launch with visible on-chain donation activity.
            </Text>

            <Stack
              direction={{ base: "column", sm: "row" }}
              spacing={3}
              pt={1}
              w={{ base: "100%", sm: "auto" }}
              maxW={{ base: "320px", sm: "none" }}
            >
              <Button
                as={Link}
                href="/campaigns"
                size={{ base: "md", md: "lg" }}
                colorScheme="primary"
                borderRadius="full"
                fontWeight="700"
                w={{ base: "100%", sm: "auto" }}
                minH={{ base: "46px", md: "48px" }}
                _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" }}
              >
                Explore Campaigns
              </Button>
              <Button
                as={Link}
                href="/campaigns/new"
                size={{ base: "md", md: "lg" }}
                variant="outline"
                colorScheme="primary"
                borderRadius="full"
                fontWeight="700"
                w={{ base: "100%", sm: "auto" }}
                minH={{ base: "46px", md: "48px" }}
                _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" }}
              >
                Start a Campaign
              </Button>
            </Stack>
          </VStack>

          <HeroPreviewCard />
        </Stack>
      </Container>
    </Box>
  );
}

export default HeroSection;
