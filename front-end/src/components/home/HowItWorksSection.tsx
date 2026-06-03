"use client";

import {
  Box,
  Button,
  Container,
  Heading,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import NextLink from "next/link";

interface Step {
  step: number;
  label: string;
  title: string;
  description: string;
}

const steps: Step[] = [
  {
    step: 1,
    label: "Discover",
    title: "Browse active campaigns",
    description:
      "Explore live campaigns, filter by goal or timeline, and review on-chain progress before deciding where to contribute.",
  },
  {
    step: 2,
    label: "Connect",
    title: "Connect your Stacks wallet",
    description:
      "Sign in with your Hiro wallet. FundStacks accepts both STX and sBTC — no exchange or third party needed.",
  },
  {
    step: 3,
    label: "Participate",
    title: "Donate or launch a campaign",
    description:
      "Fund a cause you believe in, or start your own campaign with a funding goal, end date, and beneficiary wallet.",
  },
  {
    step: 4,
    label: "Outcomes",
    title: "Track and withdraw on-chain",
    description:
      "Every donation is visible on-chain. Creators withdraw when conditions are met; donors get refunds if a campaign is cancelled.",
  },
];

export function HowItWorksSection() {
  return (
    <Box py={{ base: 10, md: 14 }} bg="bg.canvas">
      <Container maxW="container.xl" px={{ base: 4, md: 8 }}>
        <Box
          bg="bg.surface"
          borderWidth="1px"
          borderColor="border.default"
          borderRadius={{ base: "2xl", md: "3xl" }}
          boxShadow="0 1px 2px rgba(15,23,43,0.04)"
          overflow="hidden"
        >
          <Stack direction={{ base: "column", lg: "row" }} spacing={0} align="stretch">

            {/* ─── Left: intro panel (tinted lavender) ─── */}
            <Box
              flex={{ lg: "0 0 360px", xl: "0 0 400px" }}
              px={{ base: 6, md: 8, lg: 10 }}
              py={{ base: 8, md: 10, lg: 12 }}
              bg="bg.accentSubtle"
              borderRightWidth={{ lg: "1px" }}
              borderBottomWidth={{ base: "1px", lg: "0" }}
              borderColor="border.default"
              display="flex"
              flexDirection="column"
              justifyContent="space-between"
              gap={8}
            >
              <VStack align="start" spacing={5}>
                {/* Badge */}
                <Box
                  display="inline-flex"
                  alignItems="center"
                  px={3}
                  py={1}
                  borderRadius="full"
                  borderWidth="1px"
                  borderStyle="dashed"
                  borderColor="border.accent"
                  bg="bg.surface"
                >
                  <Text
                    fontSize="10px"
                    letterSpacing="0.12em"
                    color="text.accent"
                    fontWeight="700"
                    textTransform="uppercase"
                  >
                    How it works
                  </Text>
                </Box>

                {/* Headline */}
                <Heading
                  as="h2"
                  fontSize={{ base: "30px", md: "36px" }}
                  fontWeight="800"
                  lineHeight="1.1"
                  letterSpacing="-0.025em"
                  color="text.primary"
                >
                  From zero to{" "}
                  <Box as="span" color="primary.500">
                    funded
                  </Box>
                  , in four steps
                </Heading>

                {/* Body */}
                <Text
                  fontSize={{ base: "14px", md: "15px" }}
                  color="text.secondary"
                  lineHeight="1.75"
                  maxW="36ch"
                >
                  FundStacks makes it straightforward to discover credible
                  causes and move value on-chain — with full transparency at
                  every step.
                </Text>

                {/* Asset footnote */}
                <Text fontSize="12px" color="text.tertiary" lineHeight="1.6">
                  STX is the Stacks network token. sBTC is a Bitcoin-backed
                  asset that settles on Bitcoin via Stacks.
                </Text>
              </VStack>

              {/* CTA */}
              <Button
                as={NextLink}
                href="/campaigns"
                size="lg"
                colorScheme="primary"
                borderRadius="full"
                rightIcon={<ArrowForwardIcon />}
                alignSelf="flex-start"
                fontWeight="700"
                _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" }}
              >
                Get Started
              </Button>
            </Box>

            {/* ─── Right: timeline steps ─── */}
            <Box
              flex="1"
              px={{ base: 6, md: 8, lg: 10 }}
              py={{ base: 8, md: 10, lg: 12 }}
            >
              <VStack align="stretch" spacing={0}>
                {steps.map((item, index) => {
                  const isLast = index === steps.length - 1;
                  return (
                    <Box key={item.step} display="flex" gap={{ base: 4, md: 5 }}>

                      {/* Timeline: circle + spine */}
                      <Box display="flex" flexDirection="column" alignItems="center" flexShrink={0} pt="2px">
                        <Box
                          w={9}
                          h={9}
                          borderRadius="full"
                          bg="bg.accentSubtle"
                          borderWidth="1px"
                          borderColor="border.accent"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          flexShrink={0}
                        >
                          <Text fontSize="11px" fontWeight="800" color="primary.600" fontFamily="mono">
                            {String(item.step).padStart(2, "0")}
                          </Text>
                        </Box>
                        {!isLast && (
                          <Box
                            flex="1"
                            w="1px"
                            minH="16px"
                            bg="border.default"
                            my="4px"
                            aria-hidden="true"
                          />
                        )}
                      </Box>

                      {/* Step card */}
                      <Box
                        flex="1"
                        mb={isLast ? 0 : 4}
                        p={{ base: 4, md: 5 }}
                        bg="bg.surface"
                        borderWidth="1px"
                        borderColor="border.default"
                        borderRadius="xl"
                        minW={0}
                        transition="border-color 0.2s ease"
                        _hover={{ borderColor: "border.accent" }}
                      >
                        {/* Step meta */}
                        <Text
                          fontSize="10px"
                          textTransform="uppercase"
                          letterSpacing="0.1em"
                          color="text.accent"
                          fontWeight="700"
                          mb="6px"
                        >
                          Step {String(item.step).padStart(2, "0")} — {item.label}
                        </Text>

                        {/* Title */}
                        <Heading
                          as="h3"
                          fontSize={{ base: "16px", md: "18px" }}
                          fontWeight="700"
                          color="text.primary"
                          lineHeight="1.3"
                          mb="8px"
                        >
                          {item.title}
                        </Heading>

                        {/* Description */}
                        <Text fontSize="14px" color="text.secondary" lineHeight="1.7">
                          {item.description}
                        </Text>
                      </Box>
                    </Box>
                  );
                })}
              </VStack>
            </Box>

          </Stack>
        </Box>
      </Container>
    </Box>
  );
}

export default HowItWorksSection;
