import Link from "next/link";
import { Box, Button, Container, Heading, Text, VStack } from "@chakra-ui/react";

export default function NotFoundPage() {
  return (
    <Container maxW="container.md" py={{ base: 16, md: 24 }}>
      <Box
        bg="bg.surface"
        borderWidth="1px"
        borderColor="border.default"
        borderRadius="xl"
        p={{ base: 8, md: 10 }}
      >
        <VStack spacing={4} align="start">
          <Text
            fontSize="sm"
            fontWeight="700"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="text.tertiary"
          >
            404
          </Text>
          <Heading size="lg">Page not found</Heading>
          <Text color="text.secondary">
            The page you are looking for does not exist or may have been moved.
          </Text>
          <Button as={Link} href="/" colorScheme="primary">
            Back to home
          </Button>
        </VStack>
      </Box>
    </Container>
  );
}
