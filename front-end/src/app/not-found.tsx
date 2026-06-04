import Link from "next/link";
import { Button, Container, Heading, HStack, Text, VStack } from "@chakra-ui/react";
import { FundStacksMark } from "@/components/common/FundStacksMark";

export default function NotFoundPage() {
  return (
    <Container maxW="container.md" py={{ base: 16, md: 24 }}>
      <VStack spacing={6} textAlign="center" align="center">
        <FundStacksMark size={56} />
        <Text
          fontSize="11px"
          fontWeight="700"
          letterSpacing="0.08em"
          textTransform="uppercase"
          color="text.tertiary"
        >
          Error 404
        </Text>
        <VStack spacing={3}>
          <Heading size="xl">Page not found</Heading>
          <Text color="text.secondary" maxW="md" fontSize="md" lineHeight="1.6">
            The page you&apos;re looking for doesn&apos;t exist or may have moved.
            Let&apos;s get you back on track.
          </Text>
        </VStack>
        <HStack spacing={3} flexWrap="wrap" justify="center">
          <Button
            as={Link}
            href="/"
            colorScheme="primary"
            borderRadius="full"
            fontWeight="700"
          >
            Back to home
          </Button>
          <Button
            as={Link}
            href="/campaigns"
            variant="outline"
            borderRadius="full"
            fontWeight="700"
            borderColor="border.default"
            color="text.primary"
            _hover={{ bg: "bg.surfaceAlt" }}
          >
            Browse campaigns
          </Button>
        </HStack>
      </VStack>
    </Container>
  );
}
