"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Container,
  Heading,
  HStack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { WarningTwoIcon } from "@/components/icons";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Container maxW="container.md" py={{ base: 16, md: 24 }}>
      <VStack spacing={6} textAlign="center" align="center">
        <Box
          w={16}
          h={16}
          borderRadius="full"
          bg="error.100"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <WarningTwoIcon boxSize={7} color="error.600" />
        </Box>
        <VStack spacing={3}>
          <Heading size="xl">Something went wrong</Heading>
          <Text color="text.secondary" maxW="md" fontSize="md" lineHeight="1.6">
            An unexpected error occurred while loading this page. You can try
            again, or head back home.
          </Text>
        </VStack>
        {error?.message && (
          <Box
            bg="bg.surfaceAlt"
            borderWidth="1px"
            borderColor="border.default"
            borderRadius="lg"
            px={4}
            py={3}
            maxW="full"
            overflow="auto"
          >
            <Text fontSize="sm" fontFamily="mono" color="error.600">
              {error.message}
            </Text>
          </Box>
        )}
        <HStack spacing={3} flexWrap="wrap" justify="center">
          <Button
            onClick={reset}
            colorScheme="primary"
            borderRadius="full"
            fontWeight="700"
          >
            Try again
          </Button>
          <Button
            as={Link}
            href="/"
            variant="outline"
            borderRadius="full"
            fontWeight="700"
            borderColor="border.default"
            color="text.primary"
            _hover={{ bg: "bg.surfaceAlt" }}
          >
            Back to home
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}
