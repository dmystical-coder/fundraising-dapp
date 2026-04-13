"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  VStack,
  HStack,
  Flex,
} from "@chakra-ui/react";

interface Step {
  step: string;
  icon: string;
  title: string;
  description: string;
  tokenColor: string;
}

const steps: Step[] = [
  {
    step: "01",
    icon: "✍️",
    title: "Create a Campaign",
    description:
      "Set a title, describe your goal, pick a funding target and end date. Your campaign lives entirely on the Stacks blockchain — no middlemen.",
    tokenColor: "primary.500",
  },
  {
    step: "02",
    icon: "💜",
    title: "Accept STX & sBTC",
    description:
      "Supporters donate using their Stacks wallets. Both STX and sBTC are accepted. All funds are held securely in a smart contract until your campaign closes.",
    tokenColor: "secondary.500",
  },
  {
    step: "03",
    icon: "🔓",
    title: "Withdraw Funds",
    description:
      "Once the campaign ends, the beneficiary can withdraw directly to their wallet. Donors can reclaim contributions if the campaign is cancelled.",
    tokenColor: "success.500",
  },
];

const highlights = [
  { icon: "🔐", label: "Non-custodial", detail: "You always control your funds" },
  { icon: "📜", label: "Open source", detail: "Contracts are public & auditable" },
  { icon: "⚡", label: "Fast settlement", detail: "Stacks finality anchored to Bitcoin" },
  { icon: "🌍", label: "Permissionless", detail: "Anyone with a Stacks wallet can participate" },
];

export function HowItWorksSection() {
  return (
    <Box py={{ base: 12, md: 16 }} bg="bg.canvas">
      <Container maxW="container.xl">
        {/* Header */}
        <VStack spacing={3} textAlign="center" mb={{ base: 8, md: 12 }}>
          <Box
            display="inline-flex"
            alignItems="center"
            gap={2}
            bg="bg.accentSubtle"
            border="1px solid"
            borderColor="border.accent"
            borderRadius="full"
            px={4}
            py={1}
            fontSize="sm"
            color="text.accent"
            fontWeight="500"
          >
            How it works
          </Box>
          <Heading
            as="h2"
            size={{ base: "lg", md: "xl" }}
            color="text.primary"
            textStyle="h2"
            fontWeight="800"
          >
            Fundraising powered by Bitcoin
          </Heading>
          <Text
            color="text.secondary"
            maxW="480px"
            fontSize={{ base: "sm", md: "md" }}
          >
            Three steps to raise funds transparently on the Stacks blockchain — no platform fees, no custodians.
          </Text>
        </VStack>

        {/* Steps */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={{ base: 6, md: 8 }} mb={{ base: 10, md: 14 }}>
          {steps.map((item) => (
            <Box
              key={item.step}
              bg="surfaceBg"
              borderWidth="1px"
              borderColor="chakra-border-color"
              borderRadius="xl"
              p={6}
              position="relative"
              _hover={{ boxShadow: "md", borderColor: "primary.200" }}
              transition="all 0.2s"
            >
              {/* Step number */}
              <Text
                position="absolute"
                top={4}
                right={5}
                fontSize="xs"
                fontWeight="700"
                color="text.tertiary"
                fontFamily="mono"
                letterSpacing="wider"
              >
                {item.step}
              </Text>

              <VStack align="start" spacing={3}>
                <Box fontSize="2xl" role="img" aria-label={item.title}>
                  {item.icon}
                </Box>
                <Heading size="sm" color="chakra-body-text" fontWeight="700">
                  {item.title}
                </Heading>
                <Text fontSize="sm" color="text.secondary" lineHeight="1.7">
                  {item.description}
                </Text>
              </VStack>
            </Box>
          ))}
        </SimpleGrid>

        {/* Highlights strip */}
        <Box
          bg="bg.accentSubtle"
          borderRadius="xl"
          border="1px solid"
          borderColor="border.accent"
          px={{ base: 6, md: 10 }}
          py={6}
        >
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={{ base: 4, md: 6 }}>
            {highlights.map((h) => (
              <HStack key={h.label} spacing={3} align="start">
                <Flex
                  w={9}
                  h={9}
                  borderRadius="lg"
                  bg="bg.surface"
                  align="center"
                  justify="center"
                  fontSize="lg"
                  flexShrink={0}
                  boxShadow="sm"
                >
                  {h.icon}
                </Flex>
                <VStack align="start" spacing={0}>
                  <Text fontSize="sm" fontWeight="700" color="chakra-body-text">
                    {h.label}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    {h.detail}
                  </Text>
                </VStack>
              </HStack>
            ))}
          </SimpleGrid>
        </Box>
      </Container>
    </Box>
  );
}

export default HowItWorksSection;
