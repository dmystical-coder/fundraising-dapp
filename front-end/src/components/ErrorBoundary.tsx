"use client";

import { Component, type ReactNode } from "react";
import { Box, Button, Container, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { WarningTwoIcon } from "@/components/icons";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
              <Heading size="xl" color="text.primary">
                Something went wrong
              </Heading>
              <Text color="text.secondary" maxW="md" fontSize="md" lineHeight="1.6">
                An unexpected error occurred. Please try refreshing the page.
              </Text>
            </VStack>
            {this.state.error && (
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
                  {this.state.error.message}
                </Text>
              </Box>
            )}
            <HStack spacing={3} flexWrap="wrap" justify="center">
              <Button
                colorScheme="primary"
                borderRadius="full"
                fontWeight="700"
                onClick={() => {
                  this.setState({ hasError: false, error: undefined });
                  window.location.reload();
                }}
              >
                Refresh Page
              </Button>
              <Button
                as="a"
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

    return this.props.children;
  }
}
