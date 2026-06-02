"use client";

import { HStack, Skeleton, Text, TextProps, Tooltip } from "@chakra-ui/react";
import { ustxToStx, satsToSbtc } from "@/lib/currency-utils";

interface AmountDisplayProps extends Omit<TextProps, "children"> {
  amount: number | string;
  token: "stx" | "sbtc";
  usdPrice?: number;
  showUsd?: boolean;
  showSymbol?: boolean;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: { fontSize: "sm", usdFontSize: "xs", minH: "20px" },
  md: { fontSize: "md", usdFontSize: "sm", minH: "24px" },
  lg: { fontSize: "xl", usdFontSize: "md", minH: "32px" },
};

const tokenConfig = {
  stx: {
    symbol: "STX",
    color: "primary.600",
    decimals: 6,
    convert: (raw: number) => ustxToStx(raw),
  },
  sbtc: {
    symbol: "sBTC",
    color: "warning.600",
    decimals: 8,
    convert: (raw: number) => satsToSbtc(raw),
  },
};

/**
 * Formats a number with locale-aware formatting.
 */
function formatAmount(value: number, maxDecimals: number = 6): string {
  if (value === 0) return "0";

  // For very small amounts, show more precision
  if (value < 0.001) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 8,
    });
  }

  // Sub-unit amounts: a little more precision, but cap the noise.
  if (value < 1) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.min(maxDecimals, 4),
    });
  }

  // For amounts less than 1000, two decimals is enough at a glance.
  if (value < 1000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: Math.min(maxDecimals, 2),
    });
  }

  // For larger amounts, abbreviate
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(2)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseRawAmount(amount: number | string): number {
  if (typeof amount === "number") {
    return Number.isFinite(amount) ? amount : 0;
  }
  const parsed = Number.parseInt(amount, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Displays token amounts with proper formatting, symbol, and optional USD conversion.
 */
export function AmountDisplay({
  amount,
  token,
  usdPrice,
  showUsd = true,
  showSymbol = true,
  isLoading = false,
  size = "md",
  ...props
}: AmountDisplayProps) {
  const config = tokenConfig[token];
  const styles = sizeStyles[size];

  // Convert raw amount to display value
  const rawAmount = parseRawAmount(amount);
  const displayAmount = Number(config.convert(rawAmount));
  const formattedAmount = formatAmount(displayAmount);

  // Calculate USD value if price is provided
  const usdValue = usdPrice ? displayAmount * usdPrice : undefined;
  const formattedUsd = usdValue
    ? `$${formatAmount(usdValue, 2)}`
    : undefined;

  const fullAmount = `${displayAmount.toLocaleString(undefined, {
    maximumFractionDigits: 8,
  })} ${config.symbol}`;

  if (isLoading) {
    return <Skeleton height={styles.minH} width="132px" borderRadius="md" />;
  }

  return (
    <Tooltip label={fullAmount} hasArrow placement="top">
      <HStack spacing={1} align="baseline" role="text" aria-label={fullAmount} title={fullAmount} minH={styles.minH}>
        <Text
          fontFamily="mono"
          fontWeight="600"
          color={config.color}
          fontSize={styles.fontSize}
          {...props}
        >
          {formattedAmount}
        </Text>
        {showSymbol && (
          <Text
            fontSize={styles.usdFontSize}
            fontWeight="500"
            color="text.secondary"
          >
            {config.symbol}
          </Text>
        )}
        {showUsd && formattedUsd && (
          <Text fontSize={styles.usdFontSize} color="text.tertiary">
            ({formattedUsd})
          </Text>
        )}
      </HStack>
    </Tooltip>
  );
}

/**
 * Displays combined STX and sBTC amounts with total USD value.
 */
interface CombinedAmountDisplayProps {
  stxAmount: number | string;
  sbtcAmount: number | string;
  stxPrice?: number;
  sbtcPrice?: number;
  isLoading?: boolean;
  size?: "sm" | "md" | "lg";
}

export function CombinedAmountDisplay({
  stxAmount,
  sbtcAmount,
  stxPrice,
  sbtcPrice,
  isLoading = false,
  size = "md",
}: CombinedAmountDisplayProps) {
  const stxRaw = parseRawAmount(stxAmount);
  const sbtcRaw = parseRawAmount(sbtcAmount);

  const stxDisplay = Number(ustxToStx(stxRaw));
  const sbtcDisplay = Number(satsToSbtc(sbtcRaw));

  const stxUsd = stxPrice ? stxDisplay * stxPrice : 0;
  const sbtcUsd = sbtcPrice ? sbtcDisplay * sbtcPrice : 0;
  const totalUsd = stxUsd + sbtcUsd;

  const styles = sizeStyles[size];

  if (isLoading) {
    return <Skeleton height={styles.minH} width="160px" borderRadius="md" />;
  }

  // Zero state: nothing raised yet
  if (stxRaw === 0 && sbtcRaw === 0) {
    return (
      <Text fontSize={styles.fontSize} color="text.tertiary" fontWeight="500" role="status" aria-label="No funds raised yet">
        No funds raised yet
      </Text>
    );
  }

  return (
    <HStack spacing={3} flexWrap="wrap">
      {stxRaw > 0 && (
        <AmountDisplay
          amount={stxRaw}
          token="stx"
          showUsd={false}
          size={size}
        />
      )}
      {sbtcRaw > 0 && (
        <AmountDisplay
          amount={sbtcRaw}
          token="sbtc"
          showUsd={false}
          size={size}
        />
      )}
      {totalUsd > 0 && (
        <Text fontSize={styles.usdFontSize} color="text.tertiary" fontWeight="500">
          (${formatAmount(totalUsd, 2)} USD)
        </Text>
      )}
    </HStack>
  );
}

export default AmountDisplay;
