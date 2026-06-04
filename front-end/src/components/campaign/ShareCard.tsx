"use client";
import { toast } from "sonner";

import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Heading,
  HStack,
  Icon,
  Link,
  useClipboard,
} from "@chakra-ui/react";
import { CheckIcon, CopyIcon } from "@chakra-ui/icons";
import { useState, useEffect } from "react";

interface ShareCardProps {
  title: string;
  campaignId: number;
}

const XIcon = (props: Record<string, unknown>) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    />
  </Icon>
);

const WhatsAppIcon = (props: Record<string, unknown>) => (
  <Icon viewBox="0 0 24 24" {...props}>
    <path
      fill="currentColor"
      d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"
    />
  </Icon>
);

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
