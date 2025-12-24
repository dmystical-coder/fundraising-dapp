"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  Icon,
  useBreakpointValue,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import Link from "next/link";

interface HeroSectionProps {
  isWalletConnected?: boolean;
}

/**
 * Hero section for the homepage with value proposition and CTA.
 */
export function HeroSection({ isWalletConnected = false }: HeroSectionProps) {
  const headingSize = useBreakpointValue({ base: "2xl", md: "3xl", lg: "4xl" });
  const buttonSize = useBreakpointValue({ base: "md", md: "lg" });

  return (
    <Box
      position="relative"
      overflow="hidden"
      bg="linear-gradient(135deg, #FFFBF5 0%, #FEF3C7 50%, #FFEDD5 100%)"
      py={{ base: 12, md: 20 }}
      borderRadius={{ base: "none", md: "2xl" }}
      mb={8}
    >
      {/* Decorative elements */}
      <Box
        position="absolute"
        top="-50%"
        right="-10%"
        w="400px"
        h="400px"
        bg="primary.200"
        borderRadius="full"
        opacity={0.3}
        filter="blur(60px)"
      />
      <Box
        position="absolute"
        bottom="-30%"
        left="-5%"
        w="300px"
        h="300px"
        bg="secondary.200"
        borderRadius="full"
        opacity={0.3}
        filter="blur(60px)"
      />

      <Container maxW="container.lg" position="relative" zIndex={1}>
        <VStack spacing={6} textAlign="center">
          {/* Badge */}
          <Box
            px={4}
            py={1}
            bg="primary.100"
            borderRadius="full"
            borderWidth="1px"
            borderColor="primary.200"
          >
            <Text
              fontSize="sm"
              fontWeight="600"
              color="primary.700"
              letterSpacing="0.05em"
            >
              🚀 Powered by Stacks & Bitcoin
            </Text>
          </Box>

          {/* Headline */}
          <Heading
            as="h1"
            size={headingSize}
            color="gray.800"
            fontWeight="800"
            lineHeight="1.2"
            maxW="700px"
          >
            Fund Dreams with{" "}
            <Text as="span" color="primary.500">
              STX
            </Text>{" "}
            &{" "}
            <Text as="span" color="warning.500">
              sBTC
            </Text>
          </Heading>

          {/* Subheadline */}
          <Text
            fontSize={{ base: "lg", md: "xl" }}
            color="gray.600"
            maxW="600px"
            lineHeight="1.7"
          >
            Launch your fundraising campaign on the Stacks blockchain. 
            Accept donations in STX and sBTC with full transparency 
            and trustless fund management.
          </Text>

          {/* CTAs */}
          <HStack spacing={4} pt={4}>
            <Button
              as={Link}
              href="/campaigns/new"
              size={buttonSize}
              colorScheme="primary"
              bg="primary.500"
              color="white"
              leftIcon={<AddIcon />}
              _hover={{
                bg: "primary.600",
                transform: "translateY(-2px)",
                boxShadow: "lg",
              }}
              transition="all 0.2s"
            >
              Create Campaign
            </Button>
            <Button
              as={Link}
              href="#campaigns"
              size={buttonSize}
              variant="outline"
              borderColor="gray.300"
              color="gray.700"
              _hover={{
                bg: "white",
                borderColor: "primary.500",
              }}
            >
              Explore Campaigns
            </Button>
          </HStack>

          {/* Trust indicators */}
          <HStack
            spacing={8}
            pt={8}
            flexWrap="wrap"
            justify="center"
            color="gray.500"
            fontSize="sm"
          >
            <HStack>
              <Text fontSize="lg">🔒</Text>
              <Text>Trustless</Text>
            </HStack>
            <HStack>
              <Text fontSize="lg">⚡</Text>
              <Text>Fast Settlements</Text>
            </HStack>
            <HStack>
              <Text fontSize="lg">📊</Text>
              <Text>Full Transparency</Text>
            </HStack>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}

export default HeroSection;
