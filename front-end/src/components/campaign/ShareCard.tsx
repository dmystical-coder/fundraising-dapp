"use client";
import { toast } from "sonner";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  Link,
  useClipboard,
} from "@chakra-ui/react";
import { CheckIcon, CopyIcon, XIcon, WhatsAppIcon } from "@/components/icons";
import { useState, useEffect } from "react";

interface ShareCardProps {
  title: string;
  campaignId: number;
}

export const ShareCard = ({ title, campaignId }: ShareCardProps) => {
  const [url, setUrl] = useState("");
  const { hasCopied, onCopy } = useClipboard(url);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setUrl(`${window.location.origin}/campaigns/${campaignId}`);
    }
  }, [campaignId]);

  const handleCopyLink = () => {
    onCopy();
    toast.success("Copied to clipboard", { duration: 1800 });
  };

  const shareText = encodeURIComponent(
    `Check out this campaign on Stacks: "${title}"\n\nSupport it here:`
  );
  const shareUrl = encodeURIComponent(url);
  const twitterUrl = `https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`;
  const whatsappUrl = `https://wa.me/?text=${shareText}%20${shareUrl}`;

  return (
    <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="2xl" boxShadow="0 1px 2px rgba(15,23,43,0.04)">
      <CardHeader pb={2}>
        <Heading size="md">Share Campaign</Heading>
      </CardHeader>
      <CardBody pt={0}>
        <HStack spacing={2}>
          {/* X / Twitter */}
          <Button
            as={Link}
            href={twitterUrl}
            isExternal
            rel="noopener noreferrer"
            flex={1}
            size="md"
            variant="outline"
            borderRadius="full"
            borderColor="border.default"
            color="text.primary"
            aria-label="Share on X"
            transition="all 0.15s"
            _hover={{ bg: "black", color: "white", borderColor: "black" }}
          >
            <XIcon boxSize={5} />
          </Button>

          {/* WhatsApp */}
          <Button
            as={Link}
            href={whatsappUrl}
            isExternal
            rel="noopener noreferrer"
            flex={1}
            size="md"
            variant="outline"
            borderRadius="full"
            borderColor="border.default"
            color="text.primary"
            aria-label="Share on WhatsApp"
            transition="all 0.15s"
            _hover={{ bg: "#25D366", color: "white", borderColor: "#25D366" }}
          >
            <WhatsAppIcon boxSize={5} />
          </Button>

          {/* Copy link */}
          <Button
            onClick={handleCopyLink}
            flex={1}
            size="md"
            variant="outline"
            borderRadius="full"
            borderColor={hasCopied ? "success.300" : "border.default"}
            color={hasCopied ? "success.600" : "text.primary"}
            aria-label="Copy campaign link"
            transition="all 0.15s"
            _hover={
              hasCopied
                ? { bg: "success.50" }
                : { bg: "bg.surfaceAlt", borderColor: "primary.300" }
            }
          >
            {hasCopied ? <CheckIcon boxSize={4} /> : <CopyIcon boxSize={4} />}
          </Button>
        </HStack>
      </CardBody>
    </Card>
  );
};
