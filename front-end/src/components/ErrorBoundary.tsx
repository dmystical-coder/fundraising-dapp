"use client";

import { Component, type ReactNode } from "react";
import { Box, Button, Container, Heading, Text, VStack } from "@chakra-ui/react";

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
        <Container maxW="container.md" py={20}>
          <VStack spacing={6} textAlign="center">
            <Box
              w={16}
              h={16}
              borderRadius="full"
              bg="error.100"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mx="auto"
            >
              <Text fontSize="2xl">⚠️</Text>
            </Box>
            <Heading size="lg" color="chakra-body-text">
              Something went wrong
            </Heading>
            <Text color="text.secondary" maxW="400px">
              An unexpected error occurred. Please try refreshing the page.
            </Text>
            {this.state.error && (
              <Box
                bg="warm.muted"
                p={4}
                borderRadius="lg"
                maxW="100%"
                overflow="auto"
              >
                <Text fontSize="sm" fontFamily="mono" color="error.600">
                  {this.state.error.message}
                </Text>
              </Box>
            )}
            <Button
              colorScheme="primary"
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
            >
              Refresh Page
            </Button>
          </VStack>
        </Container>
      );
    }

    return this.props.children;
  }
}
