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
  VStack,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
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
  value?: string | number;
  helpText?: string;
  isLoading?: boolean;
  isError?: boolean;
  color?: string;
  accent?: boolean;
}

function StatCard({
  label,
  value,
  helpText,
  isLoading = false,
  isError = false,
  color = "text.primary",
  accent = false,
}: StatCardProps) {
  const cardMinHeight = { base: "118px", md: "124px" };

  return (
    <Stat
      px={4}
      py={3.5}
      bg="bg.surface"
      borderRadius="xl"
      borderWidth="1px"
      borderColor={accent ? "border.accent" : "border.default"}
      boxShadow="0 1px 2px rgba(15,23,43,0.04)"
      minH={cardMinHeight}
      display="flex"
      flexDirection="column"
      justifyContent="space-between"
      aria-live="polite"
    >
      <StatLabel
        fontSize="xs"
        color="text.secondary"
        fontWeight="600"
        lineHeight="1.35"
        letterSpacing="0.01em"
        mb={1.5}
      >
        {label}
      </StatLabel>

      {isLoading && (
        <VStack align="stretch" spacing={1.5} flex="1" justify="center">
          <Skeleton height="30px" width="68%" borderRadius="md" />
          <Skeleton height="10px" width="56%" borderRadius="sm" />
        </VStack>
      )}

      {!isLoading && isError && (
        <>
          <StatNumber
            fontSize={{ base: "2xl", md: "2xl", lg: "3xl" }}
            fontWeight="700"
            color="text.tertiary"
            lineHeight="1.1"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            --
          </StatNumber>
          <StatHelpText fontSize="11px" lineHeight="1.35" mt={1} color="text.tertiary" mb={0}>
            Data unavailable
          </StatHelpText>
        </>
      )}

      {!isLoading && !isError && (
        <>
          <StatNumber
            fontSize={{ base: "2xl", md: "2xl", lg: "3xl" }}
            fontWeight="700"
            color={color}
            lineHeight="1.1"
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            {typeof value === "number" ? formatNumber(value) : value}
          </StatNumber>
          {helpText && (
            <StatHelpText fontSize="11px" lineHeight="1.35" mt={1} color="text.tertiary" mb={0}>
              {helpText}
            </StatHelpText>
          )}
        </>
      )}
    </Stat>
  );
}

export function QuickStatsBar() {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: hasStatsError,
    error: statsError,
    refetch,
    isRefetching,
  } = usePlatformStats();
  const {
    data: prices,
    isLoading: pricesLoading,
    isError: hasPricesError,
  } = useCurrentPrices();

  const isLoading = statsLoading;
  const isError = hasStatsError || !stats;
  const totalRaisedLoading = statsLoading || (pricesLoading && !hasStatsError);

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
    <Box py={{ base: 4, md: 6 }}>
      <Container maxW="container.xl">
        {isError && (
          <Alert
            status="warning"
            borderRadius="lg"
            alignItems={{ base: "flex-start", md: "center" }}
            flexDirection={{ base: "column", md: "row" }}
            gap={{ base: 3, md: 2 }}
            mb={4}
          >
            <AlertIcon mt={{ base: "2px", md: 0 }} />
            <Box flex="1">
              <AlertTitle fontSize="sm">Couldn&apos;t load the stats.</AlertTitle>
              <AlertDescription fontSize="sm">
                We couldn&apos;t reach the indexer just now — give it a moment and try again.
              </AlertDescription>
              {statsError ? (
                <Text fontSize="xs" color="text.tertiary" mt={1}>
                  {String(statsError)}
                </Text>
              ) : null}
            </Box>
            <Button
              size="sm"
              variant="outline"
              colorScheme="primary"
              onClick={() => refetch()}
              isLoading={isRefetching}
            >
              Retry
            </Button>
          </Alert>
        )}

        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={3}>
          <StatCard
            label="Total Raised"
            value={hasPricesError ? "$--" : formatCurrency(totalUsd)}
            helpText={hasPricesError ? "Price feed unavailable" : "All campaigns combined"}
            isLoading={totalRaisedLoading}
            isError={isError}
            color="text.accent"
            accent
          />
          <StatCard
            label="Campaigns"
            value={stats?.total_campaigns ?? 0}
            helpText={`${stats?.campaigns_funded ?? 0} successfully funded`}
            isLoading={isLoading}
            isError={isError}
          />
          <StatCard
            label="Unique Donors"
            value={stats?.unique_donors ?? 0}
            helpText="Community supporters"
            isLoading={isLoading}
            isError={isError}
            color="text.accentSecondary"
          />
          <StatCard
            label="Donations"
            value={stats?.total_donations ?? 0}
            helpText="Total contributions"
            isLoading={isLoading}
            isError={isError}
            color="text.success"
          />
        </SimpleGrid>
      </Container>
    </Box>
  );
}

export default QuickStatsBar;
