"use client";

import { useState } from "react";
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
  useToast,
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

// Form steps configuration
const steps = [
  { title: "Basics", description: "Campaign info" },
  { title: "Funding", description: "Goal & deadline" },
  { title: "Beneficiary", description: "Who receives funds" },
  { title: "Review", description: "Confirm & create" },
];

interface FormData {
  title: string;
  description: string;
  goal: number;
  durationDays: number;
  customEndDate: string;
  useCustomDate: boolean;
  beneficiary: string;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  goal: 100,
  durationDays: 30,
  customEndDate: "",
  useCustomDate: false,
  beneficiary: "",
};

export default function CreateCampaignPage() {
  const router = useRouter();
  const toast = useToast();
  const address = useAddress();
  const { activeStep, setActiveStep, goToNext, goToPrevious } = useSteps({
    index: 0,
    count: steps.length,
  });

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update form field
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    switch (step) {
      case 0: // Basics
        if (!formData.title.trim()) {
          newErrors.title = "Campaign title is required";
        }
        if (formData.description.trim().length < 20) {
          newErrors.description = "Description must be at least 20 characters";
        }
        break;
      case 1: // Funding
        if (formData.goal <= 0) {
          newErrors.goal = "Goal must be greater than 0";
        }
        if (!formData.useCustomDate && formData.durationDays < 1) {
          newErrors.durationDays = "Duration must be at least 1 day";
        }
        if (formData.useCustomDate) {
          const endDate = new Date(formData.customEndDate);
          if (isNaN(endDate.getTime()) || endDate <= new Date()) {
            newErrors.customEndDate = "End date must be in the future";
          }
        }
        break;
      case 2: // Beneficiary
        if (!formData.beneficiary.trim()) {
          // Use connected wallet if not specified
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

  // Handle next step
  const handleNext = () => {
    if (validateStep(activeStep)) {
      goToNext();
    }
  };

  // Calculate end timestamp
  const getEndTimestamp = (): number => {
    if (formData.useCustomDate && formData.customEndDate) {
      return Math.floor(new Date(formData.customEndDate).getTime() / 1000);
    }
    // Use 0 to let contract use default duration, or calculate
    if (formData.durationDays === 30) {
      return 0; // Contract default
    }
    return Math.floor(Date.now() / 1000) + formData.durationDays * 86400;
  };

  // Submit campaign
  const handleSubmit = async () => {
    if (!address) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a campaign",
        status: "error",
        duration: 5000,
      });
      return;
    }

    if (!validateStep(activeStep)) return;

    setIsSubmitting(true);

    try {
      const beneficiaryAddress = formData.beneficiary || address;
      const endAt = getEndTimestamp();

      await openContractCall({
        contractAddress: FUNDRAISING_CONTRACT.address || "",
        contractName: FUNDRAISING_CONTRACT.name,
        functionName: "create-campaign",
        functionArgs: [
          uintCV(formData.goal), // goal (informational USD)
          uintCV(endAt), // endAt timestamp (0 for default)
          principalCV(beneficiaryAddress), // beneficiary
        ],
        network: getStacksNetwork(),
        onFinish: () => {
          toast({
            title: "Campaign Created!",
            description: "Your campaign has been submitted. It will appear once confirmed.",
            status: "success",
            duration: 8000,
            isClosable: true,
          });
          // Redirect to home after successful creation
          router.push("/");
        },
        onCancel: () => {
          setIsSubmitting(false);
          toast({
            title: "Transaction Cancelled",
            status: "warning",
            duration: 3000,
          });
        },
      });
    } catch (error) {
      console.error("Failed to create campaign:", error);
      toast({
        title: "Failed to create campaign",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        status: "error",
        duration: 5000,
      });
      setIsSubmitting(false);
    }
  };

  // Render step content
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
                bg="warm.surface"
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
                bg="warm.surface"
              />
              <FormHelperText>
                {formData.description.length}/500 characters (20 minimum)
              </FormHelperText>
              <FormErrorMessage>{errors.description}</FormErrorMessage>
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
                  <NumberInputField bg="warm.surface" borderLeftRadius={0} />
                </NumberInput>
                <InputRightAddon>USD</InputRightAddon>
              </InputGroup>
              <FormHelperText>
                This is your target amount (in USD). Donations are accepted in STX and sBTC.
              </FormHelperText>
              <FormErrorMessage>{errors.goal}</FormErrorMessage>
            </FormControl>

            <FormControl isInvalid={!!errors.durationDays}>
              <FormLabel fontWeight="600">Campaign Duration</FormLabel>
              <InputGroup size="lg">
                <NumberInput
                  value={formData.durationDays}
                  onChange={(_, val) => updateField("durationDays", val || 30)}
                  min={1}
                  max={365}
                  w="100%"
                >
                  <NumberInputField bg="warm.surface" />
                </NumberInput>
                <InputRightAddon>days</InputRightAddon>
              </InputGroup>
              <FormHelperText>
                How long should your campaign run? (Default: 30 days)
              </FormHelperText>
              <FormErrorMessage>{errors.durationDays}</FormErrorMessage>
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
                bg="warm.surface"
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
                size="sm"
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
            <Heading size="md" color="gray.700">Review Your Campaign</Heading>
            
            <Card bg="warm.muted" borderRadius="lg">
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="gray.500">Title</Text>
                    <Text fontWeight="600">{formData.title || "Untitled Campaign"}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Description</Text>
                    <Text noOfLines={3}>{formData.description || "No description"}</Text>
                  </Box>
                  <HStack justify="space-between">
                    <Box>
                      <Text fontSize="sm" color="gray.500">Goal</Text>
                      <Text fontWeight="600" color="primary.600">
                        ${formData.goal.toLocaleString()} USD
                      </Text>
                    </Box>
                    <Box textAlign="right">
                      <Text fontSize="sm" color="gray.500">Duration</Text>
                      <Text fontWeight="600">{formData.durationDays} days</Text>
                    </Box>
                  </HStack>
                  <Box>
                    <Text fontSize="sm" color="gray.500">Beneficiary</Text>
                    <Text fontFamily="mono" fontSize="sm">
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
      {/* Header */}
      <Button
        as={Link}
        href="/"
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        mb={6}
      >
        Back to Campaigns
      </Button>

      <Heading size="xl" mb={2} color="gray.800">
        Create a Campaign
      </Heading>
      <Text color="gray.600" mb={8}>
        Start raising funds in STX and sBTC on the Stacks blockchain.
      </Text>

      {/* Stepper */}
      <Box mb={8}>
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

              <Box flexShrink={0} display={{ base: "none", md: "block" }}>
                <StepTitle>{step.title}</StepTitle>
                <StepDescription>{step.description}</StepDescription>
              </Box>

              <StepSeparator />
            </Step>
          ))}
        </Stepper>
      </Box>

      {/* Form content */}
      <Card bg="warm.surface" borderColor="warm.border" borderWidth="1px" borderRadius="xl" mb={6}>
        <CardBody py={8}>
          {!address ? (
            <VStack spacing={4} py={8} textAlign="center">
              <Text color="gray.600" mb={4}>
                Connect your wallet to create a campaign
              </Text>
              <ConnectWallet />
            </VStack>
          ) : (
            renderStepContent()
          )}
        </CardBody>
      </Card>

      {/* Navigation buttons */}
      {address && (
        <HStack justify="space-between">
          <Button
            leftIcon={<ArrowBackIcon />}
            variant="ghost"
            onClick={goToPrevious}
            isDisabled={activeStep === 0}
          >
            Previous
          </Button>

          {activeStep < steps.length - 1 ? (
            <Button
              rightIcon={<ArrowForwardIcon />}
              colorScheme="primary"
              onClick={handleNext}
            >
              Next
            </Button>
          ) : (
            <Button
              leftIcon={isSubmitting ? <Spinner size="sm" /> : <CheckIcon />}
              colorScheme="primary"
              onClick={handleSubmit}
              isLoading={isSubmitting}
              loadingText="Creating..."
            >
              Create Campaign
            </Button>
          )}
        </HStack>
      )}
    </Container>
  );
}
