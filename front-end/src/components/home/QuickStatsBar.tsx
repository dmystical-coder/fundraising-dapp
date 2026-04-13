"use client";

import {
  Box,
  Container,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Skeleton,
  HStack,
  Alert,
  AlertIcon,
  Text,
  Button,
} from "@chakra-ui/react";
import { usePlatformStats } from "@/hooks/indexerQueries";
import { useCurrentPrices } from "@/lib/currency-utils";

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toFixed(0)}`;
}

interface StatCardProps {
  label: string;
  value: string | number;
  helpText?: string;
  isLoading?: boolean;
  icon?: string;
  color?: string;
}

function StatCard({
  label,
  value,
  helpText,
  isLoading = false,
  icon,
  color = "chakra-body-text",
}: StatCardProps) {
  return (
    <Stat
      px={5}
      py={4}
      bg="bg.surface"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="border.default"
      boxShadow="sm"
    >
      <HStack mb={2}>
        {icon && <Box fontSize="xl">{icon}</Box>}
        <StatLabel fontSize="sm" color="text.secondary" fontWeight="500">
          {label}
        </StatLabel>
      </HStack>
      {isLoading ? (
        <Skeleton height="32px" width="80%" />
      ) : (
        <>
          <StatNumber fontSize="2xl" fontWeight="700" color={color}>
            {typeof value === "number" ? formatNumber(value) : value}
          </StatNumber>
          {helpText && (
            <StatHelpText fontSize="xs" color="text.tertiary" mb={0}>
              {helpText}
            </StatHelpText>
          )}
        </>
      )}
    </Stat>
  );
}

export function QuickStatsBar() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch } = usePlatformStats();
  const { data: prices, isLoading: pricesLoading } = useCurrentPrices();

  const isLoading = statsLoading || pricesLoading;

  const totalStxRaised = stats ? parseInt(stats.total_stx_raised, 10) : 0;
  const totalSbtcRaised = stats ? parseInt(stats.total_sbtc_raised, 10) : 0;

  const stxUsd = prices?.stx
    ? (totalStxRaised / 1_000_000) * prices.stx
    : 0;
  const sbtcUsd = prices?.sbtc
    ? (totalSbtcRaised / 100_000_000) * prices.sbtc
    : 0;
  const totalUsd = stxUsd + sbtcUsd;

  if (statsError) {
    return (
      <Box py={6}>
        <Container maxW="container.xl">
          <Alert status="warning" borderRadius="xl" py={3}>
            <AlertIcon />
            <Text fontSize="sm" flex="1">Could not load platform stats.</Text>
            <Button size="xs" variant="outline" colorScheme="primary" onClick={() => refetch()}>
              Retry
            </Button>
          </Alert>
        </Container>
      </Box>
    );
  }

  return (
    <Box py={6}>
      <Container maxW="container.xl">
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
          <StatCard
            label="Total Raised"
            value={formatCurrency(totalUsd)}
            helpText="All campaigns combined"
            isLoading={isLoading}
            icon="💰"
            color="primary.600"
          />
          <StatCard
            label="Campaigns"
            value={stats?.total_campaigns || 0}
            helpText={`${stats?.campaigns_funded || 0} successfully funded`}
            isLoading={isLoading}
            icon="🎯"
          />
          <StatCard
            label="Unique Donors"
            value={stats?.unique_donors || 0}
            helpText="Community supporters"
            isLoading={isLoading}
            icon="👥"
            color="secondary.600"
          />
          <StatCard
            label="Donations"
            value={stats?.total_donations || 0}
            helpText="Total contributions"
            isLoading={isLoading}
            icon="🎁"
            color="success.600"
          />
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default QuickStatsBar;
