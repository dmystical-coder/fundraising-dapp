"use client";

import {
  Box,
  Container,
  Heading,
  Text,
  Button,
  VStack,
  Stack,
  HStack,
  useBreakpointValue,
} from "@chakra-ui/react";
import { AddIcon } from "@chakra-ui/icons";
import Link from "next/link";

export function HeroSection() {
  const headingSize = useBreakpointValue({ base: "xl", sm: "2xl", md: "3xl", lg: "4xl" });
  const buttonSize = useBreakpointValue({ base: "md", md: "lg" });

  return (
    <Box
      position="relative"
      overflow="hidden"
      bg="linear-gradient(180deg, #F5F3FF 0%, #EDE9FE 100%)"
      _dark={{ bg: "gray.900" }}
      py={{ base: 10, md: 16, lg: 20 }}
      px={{ base: 4, md: 0 }}
    >
      <Container maxW="container.lg" position="relative" zIndex={1}>
        <VStack spacing={{ base: 4, md: 6 }} textAlign="center">
          {/* Trust badge */}
          <Box
            display="inline-flex"
            alignItems="center"
            gap={2}
            bg="white"
            border="1px solid"
            borderColor="primary.200"
            borderRadius="full"
            px={4}
            py={1.5}
            fontSize="sm"
            color="primary.700"
            fontWeight="500"
          >
            <Text as="span" role="img" aria-label="lock">🔐</Text>
            Built on Bitcoin &middot; Powered by Stacks
          </Box>

          {/* Headline */}
          <Heading
            as="h1"
            size={headingSize}
            color="chakra-body-text"
            fontWeight="800"
            lineHeight="1.2"
            maxW="600px"
            px={{ base: 2, md: 0 }}
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
            fontSize={{ base: "md", md: "lg", lg: "xl" }}
            color="gray.600"
            _dark={{ color: "gray.300" }}
            maxW="480px"
            lineHeight="1.6"
            px={{ base: 2, md: 0 }}
          >
            Create campaigns, accept crypto donations, and manage funds
            transparently on the Stacks blockchain.
          </Text>

          {/* CTAs */}
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
              colorScheme="primary"
              leftIcon={<AddIcon />}
              _hover={{
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
              colorScheme="primary"
              bg="white"
              w={{ base: "100%", sm: "auto" }}
            >
              Explore Campaigns
            </Button>
          </Stack>

          {/* Trust indicators */}
          <HStack
            spacing={{ base: 4, md: 8 }}
            pt={4}
            flexWrap="wrap"
            justify="center"
          >
            {[
              { icon: "✓", label: "Non-custodial" },
              { icon: "✓", label: "Smart contract secured" },
              { icon: "✓", label: "No platform fees" },
            ].map((item) => (
              <HStack key={item.label} spacing={1.5}>
                <Text color="success.500" fontWeight="bold" fontSize="sm">
                  {item.icon}
                </Text>
              <Text fontSize="sm" color="gray.500" _dark={{ color: "gray.400" }}>
                  {item.label}
                </Text>
              </HStack>
            ))}
          </HStack>
        </VStack>
      </Container>
    </Box>
  );
}

export default HeroSection;
