"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Container,
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Card,
  CardBody,
  Button,
  FormControl,
  FormLabel,
  FormHelperText,
  FormErrorMessage,
  Input,
  InputGroup,
  InputLeftAddon,
  InputRightAddon,
  Image,
  AspectRatio,
  Icon,
  Textarea,
  NumberInput,
  NumberInputField,
  Stepper,
  Step,
  StepIndicator,
  StepStatus,
  StepIcon,
  StepNumber,
  StepTitle,
  StepDescription,
  StepSeparator,
  useSteps,
  Alert,
  AlertIcon,
  Spinner,
} from "@chakra-ui/react";
import { ArrowBackIcon, ArrowForwardIcon, CheckIcon } from "@chakra-ui/icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { uintCV, principalCV } from "@stacks/transactions";

import { ConnectWallet, useAddress } from "@/components/ConnectWallet";
import { openContractCall } from "@/lib/contract-utils";
import { FUNDRAISING_CONTRACT } from "@/constants/contracts";
import { getStacksNetwork } from "@/lib/stacks-api";

const steps = [
  { title: "Basics", description: "Campaign info" },
  { title: "Funding", description: "Goal & deadline" },
  { title: "Beneficiary", description: "Who receives funds" },
  { title: "Review", description: "Confirm & create" },
];

interface FormData {
  title: string;
  description: string;
  coverUrl: string;
  goal: number;
  endDate: string;
  beneficiary: string;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  coverUrl: "",
  goal: 100,
  endDate: "",
  beneficiary: "",
};

// Minimal outline "image" glyph for the empty cover-preview placeholder.
function ImageGlyph(props: React.ComponentProps<typeof Icon>) {
  return (
    <Icon viewBox="0 0 24 24" fill="none" {...props}>
      <path
        d="M3 5.5A2.5 2.5 0 0 1 5.5 3h13A2.5 2.5 0 0 1 21 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5v-13Z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="8.5" cy="8.5" r="1.6" fill="currentColor" />
      <path
        d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L17 18"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

/** A cover image must be a real http(s) URL we can render in an <img>. */
function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export default function CreateCampaignPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const address = useAddress();
  const { activeStep, setActiveStep, goToNext, goToPrevious } = useSteps({
    index: 0,
    count: steps.length,
  });

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Tracks whether the pasted cover URL actually resolves to a loadable image.
  const [coverLoadFailed, setCoverLoadFailed] = useState(false);

  const trimmedCover = formData.coverUrl.trim();
  const showCoverPreview = trimmedCover.length > 0 && isHttpUrl(trimmedCover);

  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    switch (step) {
      case 0:
        if (!formData.title.trim()) {
          newErrors.title = "Campaign title is required";
        }
        if (formData.description.trim().length < 20) {
          newErrors.description = "Description must be at least 20 characters";
        }
        // Cover is optional, but if provided it must be a usable image URL.
        if (formData.coverUrl.trim()) {
          if (!isHttpUrl(formData.coverUrl.trim())) {
            newErrors.coverUrl = "Enter a valid image URL starting with http(s)://";
          } else if (coverLoadFailed) {
            newErrors.coverUrl = "That image couldn't be loaded — check the link";
          }
        }
        break;
      case 1:
        if (formData.goal <= 0) {
          newErrors.goal = "Goal must be greater than 0";
        }
        if (!formData.endDate) {
          newErrors.endDate = "End date is required";
        } else {
          const endDate = new Date(formData.endDate);
          if (isNaN(endDate.getTime()) || endDate <= new Date()) {
            newErrors.endDate = "End date must be in the future";
          }
        }
        break;
      case 2:
        if (!formData.beneficiary.trim()) {
          if (address) {
            setFormData((prev) => ({ ...prev, beneficiary: address }));
          } else {
            newErrors.beneficiary = "Beneficiary address is required";
          }
        } else if (!formData.beneficiary.startsWith("SP") && !formData.beneficiary.startsWith("ST")) {
          newErrors.beneficiary = "Invalid Stacks address format";
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      goToNext();
    }
  };

  const getEndTimestamp = (): number => {
    if (formData.endDate) {
      return Math.floor(new Date(formData.endDate).getTime() / 1000);
    }
    return Math.floor(Date.now() / 1000) + 30 * 86400;
  };

  const handleSubmit = async () => {
    if (!address) {
      toast.error("Wallet not connected", {
        description: "Please connect your wallet to create a campaign",
        duration: 5000,
      });
      return;
    }

    if (!validateStep(activeStep)) return;

    setIsSubmitting(true);

    try {
      const beneficiaryAddress = formData.beneficiary || address;
      const endAt = getEndTimestamp();

      const pendingMetadata = {
        owner: address,
        title: formData.title,
        description: formData.description,
        coverUrl: formData.coverUrl.trim() || undefined,
        createdAt: Date.now(),
      };
      localStorage.setItem(`pending_campaign_metadata_${address}`, JSON.stringify(pendingMetadata));

      await openContractCall({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "create-campaign",
        functionArgs: [
          uintCV(formData.goal),
          uintCV(endAt),
          principalCV(beneficiaryAddress),
        ],
        network: getStacksNetwork(),
        onFinish: () => {
          queryClient.invalidateQueries({ queryKey: ["indexer", "campaigns"] });
          queryClient.invalidateQueries({ queryKey: ["campaigns"] });
          
          toast.success("Campaign Created!", {
            description: "Your campaign has been submitted. Metadata will be saved once confirmed.",
            duration: 8000,
          });
          router.push("/");
        },
        onCancel: () => {
          setIsSubmitting(false);
          localStorage.removeItem(`pending_campaign_metadata_${address}`);
          toast.warning("Transaction Cancelled", {
            duration: 3000,
          });
        },
      });
    } catch (error) {
      console.error("Failed to create campaign:", error);
      localStorage.removeItem(`pending_campaign_metadata_${address}`);
      toast.error("Failed to create campaign", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
        duration: 5000,
      });
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl isInvalid={!!errors.title}>
              <FormLabel fontWeight="600">Campaign Title</FormLabel>
              <Input
                placeholder="Enter a catchy title for your campaign"
                value={formData.title}
                onChange={(e) => updateField("title", e.target.value)}
                size="lg"
                bg="bg.field"
                borderRadius="xl"
              />
              <FormHelperText>A clear, compelling title helps attract donors</FormHelperText>
              <FormErrorMessage>{errors.title}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.description}>
              <FormLabel fontWeight="600">Description</FormLabel>
              <Textarea
                placeholder="Tell your story. Why are you raising funds? What will the money be used for?"
                value={formData.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={6}
                bg="bg.field"
                borderRadius="xl"
              />
              <FormHelperText>
                {formData.description.length}/500 characters (20 minimum)
              </FormHelperText>
              <FormErrorMessage>{errors.description}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.coverUrl}>
              <FormLabel fontWeight="600">
                Cover image{" "}
                <Text as="span" fontWeight="400" color="text.tertiary" fontSize="sm">
                  (optional)
                </Text>
              </FormLabel>
              <Input
                type="url"
                inputMode="url"
                placeholder="https://images.example.com/your-cover.jpg"
                value={formData.coverUrl}
                onChange={(e) => {
                  setCoverLoadFailed(false);
                  updateField("coverUrl", e.target.value);
                }}
                size="lg"
                bg="bg.field"
                borderRadius="xl"
              />
              <FormHelperText>
                Paste a link to a hosted image. Shown at the top of your campaign
                and on its card (16:9 works best).
              </FormHelperText>
              <FormErrorMessage>{errors.coverUrl}</FormErrorMessage>

              {/* Live preview — mirrors the 16:9 cover used on the campaign card */}
              <Box mt={3}>
                {showCoverPreview && !coverLoadFailed ? (
                  <AspectRatio ratio={16 / 9} w="100%">
                    <Image
                      src={trimmedCover}
                      alt="Cover preview"
                      objectFit="cover"
                      borderRadius="xl"
                      borderWidth="1px"
                      borderColor="border.default"
                      onError={() => setCoverLoadFailed(true)}
                      onLoad={() => setCoverLoadFailed(false)}
                    />
                  </AspectRatio>
                ) : (
                  <AspectRatio ratio={16 / 9} w="100%">
                    <VStack
                      spacing={1}
                      bg="bg.accentSubtle"
                      borderWidth="1px"
                      borderStyle="dashed"
                      borderColor={
                        coverLoadFailed ? "warning.400" : "border.accent"
                      }
                      borderRadius="xl"
                      color="text.tertiary"
                    >
                      <Icon as={ImageGlyph} boxSize={6} />
                      <Text fontSize="sm" fontWeight="500" textAlign="center" px={4}>
                        {coverLoadFailed
                          ? "Couldn't load that image — check the link"
                          : "Cover preview appears here"}
                      </Text>
                    </VStack>
                  </AspectRatio>
                )}
              </Box>
            </FormControl>
          </VStack>
        );

      case 1:
        return (
          <VStack spacing={6} align="stretch">
            <FormControl isInvalid={!!errors.goal}>
              <FormLabel fontWeight="600">Funding Goal (USD)</FormLabel>
              <InputGroup size="lg">
                <InputLeftAddon>$</InputLeftAddon>
                <NumberInput
                  value={formData.goal}
                  onChange={(_, val) => updateField("goal", val || 0)}
                  min={1}
                  max={10000000}
                  w="100%"
                >
                  <NumberInputField bg="bg.field" borderLeftRadius={0} />
                </NumberInput>
                <InputRightAddon>USD</InputRightAddon>
              </InputGroup>
              <FormHelperText>
                This is your target amount (in USD). Donations are accepted in STX and sBTC.
              </FormHelperText>
              <FormErrorMessage>{errors.goal}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.endDate}>
              <FormLabel fontWeight="600">Campaign End Date</FormLabel>
              <Input
                type="datetime-local"
                value={formData.endDate || ""}
                onChange={(e) => updateField("endDate", e.target.value)}
                size="lg"
                bg="bg.field"
                borderRadius="xl"
                min={new Date(Date.now() + 3600000).toISOString().slice(0, 16)}
              />
              <FormHelperText>
                When should your campaign end? Must be at least 1 hour from now.
              </FormHelperText>
              <FormErrorMessage>{errors.endDate}</FormErrorMessage>
            </FormControl>
          </VStack>
        );

      case 2:
        return (
          <VStack spacing={6} align="stretch">
            <Alert status="info" borderRadius="lg">
              <AlertIcon />
              <Text fontSize="sm">
                The beneficiary is the address that will receive funds when the campaign ends.
                If left empty, your connected wallet will be used.
              </Text>
            </Alert>

            <FormControl isInvalid={!!errors.beneficiary}>
              <FormLabel fontWeight="600">Beneficiary Address</FormLabel>
              <Input
                placeholder={address || "SP... or ST..."}
                value={formData.beneficiary}
                onChange={(e) => updateField("beneficiary", e.target.value)}
                size="lg"
                bg="bg.field"
                borderRadius="xl"
                fontFamily="mono"
              />
              <FormHelperText>
                Stacks address that will receive withdrawn funds
              </FormHelperText>
              <FormErrorMessage>{errors.beneficiary}</FormErrorMessage>
            </FormControl>

            {address && !formData.beneficiary && (
              <Button
                variant="outline"
                colorScheme="primary"
                size="sm"
                borderRadius="full"
                fontWeight="700"
                alignSelf="flex-start"
                onClick={() => updateField("beneficiary", address)}
              >
                Use my wallet address
              </Button>
            )}
          </VStack>
        );

      case 3:
        return (
          <VStack spacing={6} align="stretch">
            <Heading size="md">Review Your Campaign</Heading>
            
            <Card bg="bg.surfaceAlt" borderRadius="xl" overflow="hidden">
              {showCoverPreview && !coverLoadFailed && (
                <AspectRatio ratio={16 / 9} w="100%">
                  <Image
                    src={trimmedCover}
                    alt="Cover preview"
                    objectFit="cover"
                    onError={() => setCoverLoadFailed(true)}
                  />
                </AspectRatio>
              )}
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="text.secondary">Title</Text>
                    <Text fontWeight="600" color="text.primary">{formData.title || "Untitled Campaign"}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="text.secondary">Description</Text>
                    <Text noOfLines={3} color="text.primary">{formData.description || "No description"}</Text>
                  </Box>
                  <HStack justify="space-between">
                    <Box>
                      <Text fontSize="sm" color="text.secondary">Goal</Text>
                      <Text fontWeight="600" color="primary.600">
                        ${formData.goal.toLocaleString()} USD
                      </Text>
                    </Box>
                    <Box textAlign="right">
                      <Text fontSize="sm" color="text.secondary">End Date</Text>
                      <Text fontWeight="600" color="text.primary">
                        {formData.endDate 
                          ? new Date(formData.endDate).toLocaleString() 
                          : "Not set"}
                      </Text>
                    </Box>
                  </HStack>
                  <Box>
                    <Text fontSize="sm" color="text.secondary">Beneficiary</Text>
                    <Text fontFamily="mono" fontSize="sm" color="text.primary">
                      {formData.beneficiary || address || "Not set"}
                    </Text>
                  </Box>
                </VStack>
              </CardBody>
            </Card>

            <Alert status="warning" borderRadius="lg">
              <AlertIcon />
              <Text fontSize="sm">
                Once created, campaigns cannot be edited. Funds can only be withdrawn by the
                beneficiary after the campaign ends.
              </Text>
            </Alert>
          </VStack>
        );

      default:
        return null;
    }
  };

  return (
    <Container maxW="container.md" py={8}>
      <Button
        as={Link}
        href="/campaigns"
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        borderRadius="full"
        fontWeight="700"
        mb={6}
      >
        Back to Campaigns
      </Button>

      <Heading size={{ base: "lg", md: "xl" }} mb={2}>
        Create a Campaign
      </Heading>
      <Text color="text.secondary" mb={{ base: 6, md: 8 }}>
        Start raising funds in STX and sBTC on the Stacks blockchain.
      </Text>

      {/* Progress — compact bar on mobile, labeled stepper on desktop */}
      <Box mb={{ base: 6, md: 8 }}>
        {/* Mobile: compact "Step X of N" + progress bar */}
        <Box display={{ base: "block", md: "none" }}>
          <Text
            fontSize="11px"
            fontWeight="700"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="text.tertiary"
            mb={2}
          >
            Step {activeStep + 1} of {steps.length} · {steps[activeStep].title}
          </Text>
          <Box h="6px" borderRadius="full" bg="bg.surfaceAlt" overflow="hidden">
            <Box
              h="100%"
              borderRadius="full"
              bg="primary.500"
              transition="width 0.25s ease"
              w={`${((activeStep + 1) / steps.length) * 100}%`}
            />
          </Box>
        </Box>

        {/* Desktop: full labeled stepper */}
        <Box display={{ base: "none", md: "block" }}>
          <Stepper index={activeStep} colorScheme="primary">
            {steps.map((step, index) => (
              <Step key={index} onClick={() => index <= activeStep && setActiveStep(index)}>
                <StepIndicator cursor={index <= activeStep ? "pointer" : "default"}>
                  <StepStatus
                    complete={<StepIcon />}
                    incomplete={<StepNumber />}
                    active={<StepNumber />}
                  />
                </StepIndicator>
                <Box flexShrink={0}>
                  <StepTitle>{step.title}</StepTitle>
                  <StepDescription>{step.description}</StepDescription>
                </Box>
                <StepSeparator />
              </Step>
            ))}
          </Stepper>
        </Box>
      </Box>

      <Card
        bg="bg.surface"
        borderColor="border.default"
        borderWidth="1px"
        borderRadius="2xl"
        boxShadow="0 1px 2px rgba(15,23,43,0.04)"
        mb={6}
      >
        <CardBody py={{ base: 6, md: 8 }}>
          {!address ? (
            <VStack spacing={4} py={8} textAlign="center">
              <Text color="text.secondary" mb={4}>
                Connect your wallet to create a campaign
              </Text>
              <ConnectWallet />
            </VStack>
          ) : (
            renderStepContent()
          )}
        </CardBody>
      </Card>

      {address && (
        <Box
          position={{ base: "sticky", md: "static" }}
          bottom={0}
          zIndex={1}
          bg="bg.canvas"
          borderTopWidth={{ base: "1px", md: 0 }}
          borderColor="border.default"
          py={{ base: 3, md: 0 }}
        >
          <HStack justify="space-between" spacing={3}>
            <Button
              leftIcon={<ArrowBackIcon />}
              variant="ghost"
              borderRadius="full"
              fontWeight="700"
              onClick={goToPrevious}
              isDisabled={activeStep === 0}
            >
              Previous
            </Button>

            {activeStep < steps.length - 1 ? (
              <Button
                rightIcon={<ArrowForwardIcon />}
                colorScheme="primary"
                borderRadius="full"
                fontWeight="700"
                onClick={handleNext}
                flex={{ base: 1, md: "initial" }}
              >
                Next
              </Button>
            ) : (
              <Button
                leftIcon={isSubmitting ? <Spinner size="sm" /> : <CheckIcon />}
                colorScheme="primary"
                borderRadius="full"
                fontWeight="700"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                loadingText="Creating..."
                flex={{ base: 1, md: "initial" }}
              >
                Create Campaign
              </Button>
            )}
          </HStack>
        </Box>
      )}
    </Container>
  );
}
