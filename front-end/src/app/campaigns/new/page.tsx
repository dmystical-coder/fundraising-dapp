"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  Tooltip,
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
  goal: number;
  endDate: string;
  beneficiary: string;
}

const initialFormData: FormData = {
  title: "",
  description: "",
  goal: 100,
  endDate: "",
  beneficiary: "",
};

export default function CreateCampaignPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const address = useAddress();
  const { activeStep, setActiveStep, goToNext, goToPrevious } = useSteps({
    index: 0,
    count: steps.length,
  });

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      const pendingMetadata = {
        owner: address,
        title: formData.title,
        description: formData.description,
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
          
          toast({
            title: "Campaign Created!",
            description: "Your campaign has been submitted. Metadata will be saved once confirmed.",
            status: "success",
            duration: 8000,
            isClosable: true,
          });
          router.push("/");
        },
        onCancel: () => {
          setIsSubmitting(false);
          localStorage.removeItem(`pending_campaign_metadata_${address}`);
          toast({
            title: "Transaction Cancelled",
            status: "warning",
            duration: 3000,
          });
        },
      });
    } catch (error) {
      console.error("Failed to create campaign:", error);
      localStorage.removeItem(`pending_campaign_metadata_${address}`);
      toast({
        title: "Failed to create campaign",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        status: "error",
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
            
            <Card bg="bg.surfaceAlt" borderRadius="lg">
              <CardBody>
                <VStack spacing={4} align="stretch">
                  <Box>
                    <Text fontSize="sm" color="text.secondary">Title</Text>
                    <Text fontWeight="600" color="chakra-body-text">{formData.title || "Untitled Campaign"}</Text>
                  </Box>
                  <Box>
                    <Text fontSize="sm" color="text.secondary">Description</Text>
                    <Text noOfLines={3} color="chakra-body-text">{formData.description || "No description"}</Text>
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
                      <Text fontWeight="600" color="chakra-body-text">
                        {formData.endDate 
                          ? new Date(formData.endDate).toLocaleString() 
                          : "Not set"}
                      </Text>
                    </Box>
                  </HStack>
                  <Box>
                    <Text fontSize="sm" color="text.secondary">Beneficiary</Text>
                    <Text fontFamily="mono" fontSize="sm" color="chakra-body-text">
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
        href="/"
        leftIcon={<ArrowBackIcon />}
        variant="ghost"
        mb={6}
      >
        Back to Campaigns
      </Button>

      <Heading size="xl" mb={2}>
        Create a Campaign
      </Heading>
      <Text color="text.secondary" mb={8}>
        Start raising funds in STX and sBTC on the Stacks blockchain.
      </Text>

      {/* Stepper — shows abbreviated labels on mobile via Tooltip */}
      <Box mb={8}>
        <Stepper index={activeStep} colorScheme="primary">
          {steps.map((step, index) => (
            <Step key={index} onClick={() => index <= activeStep && setActiveStep(index)}>
              <Tooltip
                label={`${step.title}: ${step.description}`}
                display={{ md: "none" }}
                hasArrow
              >
                <StepIndicator cursor={index <= activeStep ? "pointer" : "default"}>
                  <StepStatus
                    complete={<StepIcon />}
                    incomplete={<StepNumber />}
                    active={<StepNumber />}
                  />
                </StepIndicator>
              </Tooltip>

              <Box flexShrink={0}>
                <Box display={{ base: "none", md: "block" }}>
                  <StepTitle>{step.title}</StepTitle>
                  <StepDescription>{step.description}</StepDescription>
                </Box>
                {/* Abbreviated label on mobile */}
                <Text
                  display={{ base: "block", md: "none" }}
                  fontSize="xs"
                  fontWeight={index === activeStep ? "bold" : "normal"}
                  color={index <= activeStep ? "primary.600" : "text.tertiary"}
                >
                  {step.title}
                </Text>
              </Box>

              <StepSeparator />
            </Step>
          ))}
        </Stepper>
      </Box>

      <Card bg="bg.surface" borderColor="border.default" borderWidth="1px" borderRadius="xl" mb={6}>
        <CardBody py={8}>
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
