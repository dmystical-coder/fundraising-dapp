"use client";

import { HStack, Text, TextProps, Tooltip } from "@chakra-ui/react";
import { ustxToStx, satsToSbtc } from "@/lib/currency-utils";

interface AmountDisplayProps extends Omit<TextProps, "children"> {
  amount: number | string;
  token: "stx" | "sbtc";
  usdPrice?: number;
  showUsd?: boolean;
  showSymbol?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: { fontSize: "sm", usdFontSize: "xs" },
  md: { fontSize: "md", usdFontSize: "sm" },
  lg: { fontSize: "xl", usdFontSize: "md" },
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

  // For amounts less than 1000, show decimals
  if (value < 1000) {
    return value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: maxDecimals,
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

/**
 * Displays token amounts with proper formatting, symbol, and optional USD conversion.
 */
export function AmountDisplay({
  amount,
  token,
  usdPrice,
  showUsd = true,
  showSymbol = true,
  size = "md",
  ...props
}: AmountDisplayProps) {
  const config = tokenConfig[token];
  const styles = sizeStyles[size];

  // Convert raw amount to display value
  const rawAmount = typeof amount === "string" ? parseInt(amount, 10) : amount;
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

  return (
    <Tooltip label={fullAmount} hasArrow placement="top">
      <HStack spacing={1} align="baseline">
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
            color="gray.500"
          >
            {config.symbol}
          </Text>
        )}
        {showUsd && formattedUsd && (
          <Text fontSize={styles.usdFontSize} color="gray.400">
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
  size?: "sm" | "md" | "lg";
}

export function CombinedAmountDisplay({
  stxAmount,
  sbtcAmount,
  stxPrice,
  sbtcPrice,
  size = "md",
}: CombinedAmountDisplayProps) {
  const stxRaw = typeof stxAmount === "string" ? parseInt(stxAmount, 10) : stxAmount;
  const sbtcRaw = typeof sbtcAmount === "string" ? parseInt(sbtcAmount, 10) : sbtcAmount;

  const stxDisplay = Number(ustxToStx(stxRaw));
  const sbtcDisplay = Number(satsToSbtc(sbtcRaw));

  const stxUsd = stxPrice ? stxDisplay * stxPrice : 0;
  const sbtcUsd = sbtcPrice ? sbtcDisplay * sbtcPrice : 0;
  const totalUsd = stxUsd + sbtcUsd;

  const styles = sizeStyles[size];

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
        <Text fontSize={styles.usdFontSize} color="gray.400" fontWeight="500">
          (${formatAmount(totalUsd, 2)} USD)
        </Text>
      )}
    </HStack>
  );
}

export default AmountDisplay;
