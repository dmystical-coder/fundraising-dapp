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
  SimpleGrid,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import Link from "next/link";

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
                href="#campaigns"
                size={{ base: "md", md: "lg" }}
                colorScheme="primary"
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
                colorScheme="secondary"
                fontWeight="700"
                w={{ base: "100%", sm: "auto" }}
                minH={{ base: "46px", md: "48px" }}
                leftIcon={<AddIcon />}
                _focusVisible={{ boxShadow: "0 0 0 3px var(--chakra-colors-focus-ring)" }}
              >
                Start a Campaign
              </Button>
            </Stack>
          </VStack>

          <Box w={{ base: "100%", lg: "460px" }} maxW={{ base: "100%", lg: "460px" }}>
            <Box
              bg="gray.900"
              color="gray.100"
              borderRadius="2xl"
              borderWidth="1px"
              borderColor="gray.700"
              boxShadow="card"
              overflow="hidden"
            >
              <HStack px={4} py={3} bg="blackAlpha.500" borderBottomWidth="1px" borderBottomColor="gray.700" spacing={2}>
                <Box w={2.5} h={2.5} borderRadius="full" bg="error.400" />
                <Box w={2.5} h={2.5} borderRadius="full" bg="warning.400" />
                <Box w={2.5} h={2.5} borderRadius="full" bg="success.400" />
                <Text fontSize="xs" color="gray.300" ml={2}>
                  Live campaign snapshot
                </Text>
              </HStack>

              <VStack align="stretch" spacing={4} p={{ base: 4, md: 5 }}>
                <Text fontSize="sm" color="gray.300" lineHeight="1.6">
                  Campaigns on FundStacks show real on-chain progress so supporters can fund with confidence.
                </Text>

                <SimpleGrid columns={2} spacing={3}>
                  <Box p={3} borderRadius="lg" bg="whiteAlpha.100" borderWidth="1px" borderColor="whiteAlpha.200">
                    <Text fontSize="lg" fontWeight="800" color="primary.300">
                      24/7
                    </Text>
                    <Text fontSize="xs" color="gray.300">
                      Global donation access
                    </Text>
                  </Box>
                  <Box p={3} borderRadius="lg" bg="whiteAlpha.100" borderWidth="1px" borderColor="whiteAlpha.200">
                    <Text fontSize="lg" fontWeight="800" color="secondary.300">
                      On-chain
                    </Text>
                    <Text fontSize="xs" color="gray.300">
                      Transparent records
                    </Text>
                  </Box>
                </SimpleGrid>

                <Box p={3} borderRadius="lg" bg="whiteAlpha.100" borderWidth="1px" borderColor="whiteAlpha.200">
                  <HStack justify="space-between" mb={2}>
                    <Text fontSize="xs" color="gray.300" textTransform="uppercase" letterSpacing="0.08em">
                      Sample campaign progress
                    </Text>
                    <Text fontSize="sm" color="primary.300" fontWeight="700">
                      68%
                    </Text>
                  </HStack>
                  <Box w="100%" h="2" borderRadius="full" bg="whiteAlpha.300" overflow="hidden">
                    <Box w="68%" h="100%" bg="primary.400" />
                  </Box>
                </Box>
              </VStack>
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}

export default HeroSection;
