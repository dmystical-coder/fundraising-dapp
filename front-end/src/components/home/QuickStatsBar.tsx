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
} from "@chakra-ui/react";
import { usePlatformStats } from "@/hooks/indexerQueries";
import { useCurrentPrices } from "@/lib/currency-utils";

/**
 * Format large numbers for display.
 */
function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

/**
 * Format currency amount.
 */
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
  color = "gray.800",
}: StatCardProps) {
  return (
    <Stat
      px={5}
      py={4}
      bg="warm.surface"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="warm.border"
      boxShadow="sm"
    >
      <HStack mb={2}>
        {icon && <Box fontSize="xl">{icon}</Box>}
        <StatLabel fontSize="sm" color="gray.500" fontWeight="500">
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
            <StatHelpText fontSize="xs" color="gray.400" mb={0}>
              {helpText}
            </StatHelpText>
          )}
        </>
      )}
    </Stat>
  );
}

/**
 * Quick stats bar showing platform-wide metrics.
 */
export function QuickStatsBar() {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: prices, isLoading: pricesLoading } = useCurrentPrices();

  const isLoading = statsLoading || pricesLoading;

  // Calculate total USD raised
  const totalStxRaised = stats ? parseInt(stats.total_stx_raised, 10) : 0;
  const totalSbtcRaised = stats ? parseInt(stats.total_sbtc_raised, 10) : 0;

  const stxUsd = prices?.stx
    ? (totalStxRaised / 1_000_000) * prices.stx
    : 0;
  const sbtcUsd = prices?.sbtc
    ? (totalSbtcRaised / 100_000_000) * prices.sbtc
    : 0;
  const totalUsd = stxUsd + sbtcUsd;

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
