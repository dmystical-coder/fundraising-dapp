"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  Stack,
  useBreakpointValue,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import Link from "next/link";

/**
 * Hero section for the homepage with value proposition and CTA.
 */
export function HeroSection() {
  const headingSize = useBreakpointValue({ base: "xl", sm: "2xl", md: "3xl", lg: "4xl" });
  const buttonSize = useBreakpointValue({ base: "md", md: "lg" });

  return (
    <Box
      position="relative"
      overflow="hidden"
      bg="linear-gradient(180deg, #FFF7ED 0%, #FFEDD5 100%)"
      py={{ base: 10, md: 16, lg: 20 }}
      px={{ base: 4, md: 0 }}
    >
      <Container maxW="container.lg" position="relative" zIndex={1}>
        <VStack spacing={{ base: 4, md: 6 }} textAlign="center">
          {/* Headline */}
          <Heading
            as="h1"
            size={headingSize}
            color="gray.800"
            fontWeight="800"
            lineHeight="1.2"
            maxW="600px"
            px={{ base: 2, md: 0 }}
          >
            Raise funds with{" "}
            <Text as="span" color="primary.600">
              STX
            </Text>{" "}
            &{" "}
            <Text as="span" color="warning.600">
              sBTC
            </Text>
          </Heading>

          {/* Subheadline */}
          <Text
            fontSize={{ base: "md", md: "lg", lg: "xl" }}
            color="gray.600"
            maxW="450px"
            lineHeight="1.6"
            px={{ base: 2, md: 0 }}
          >
            Create campaigns, accept crypto donations, 
            and manage funds on the Stacks blockchain.
          </Text>

          {/* CTAs - Stack vertically on mobile */}
          <Stack 
            direction={{ base: "column", sm: "row" }} 
            spacing={{ base: 3, sm: 4 }} 
            pt={{ base: 2, md: 4 }}
            w={{ base: "100%", sm: "auto" }}
          >
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
              w={{ base: "100%", sm: "auto" }}
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
              bg="white"
              _hover={{
                bg: "gray.50",
                borderColor: "primary.500",
              }}
              w={{ base: "100%", sm: "auto" }}
            >
              Explore Campaigns
            </Button>
          </Stack>
        </VStack>
      </Container>
    </Box>
  );
}

export default HeroSection;
