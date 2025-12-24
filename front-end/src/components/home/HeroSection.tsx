"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  HStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import Link from "next/link";

/**
 * Hero section for the homepage with value proposition and CTA.
 */
export function HeroSection() {
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
          {/* Headline */}
          <Heading
            as="h1"
            size={headingSize}
            color="gray.800"
            fontWeight="800"
            lineHeight="1.2"
            maxW="700px"
          >
            Raise funds with{" "}
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
            maxW="500px"
            lineHeight="1.7"
          >
            Create campaigns, accept crypto donations, 
            and manage funds directly on the Stacks blockchain.
          </Text>

          {/* CTAs */}
          <HStack spacing={4} pt={4}>
            <Button
              as={Link}
              href="/campaigns/new"
              size={buttonSize}
              bg="primary.500"
              color="white"
              leftIcon={<AddIcon />}
              _hover={{
                bg: "primary.600",
                color: "white",
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
              borderColor="gray.400"
              color="gray.700"
              _hover={{
                bg: "white",
                borderColor: "primary.500",
              }}
            >
              Explore Campaigns
            </Button>
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}

export default HeroSection;
