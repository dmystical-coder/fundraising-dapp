import { useQuery, UseQueryOptions } from "@tanstack/react-query";

export const formatStacksAmount = (amountInStacks: number): string => {
  return amountInStacks.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
};

/**
 * microToStacks
 *
 * @param {Number} amountInMicroStacks - the amount of microStacks to convert
 * @param {Number} localString - big pretty print if true
 */
export const ustxToStx = (
  amountInMicroStacks: string | number,
  localString = false
): number | string => {
  const value = Number(Number(amountInMicroStacks) / 10 ** 6);
  if (localString) {
    return formatStacksAmount(value);
  }
  return value;
};

/**
 * stxToUstx
 *
 * Converts STX to microSTX (ustx)
 *
 * @param {Number|string} amountInStacks - the amount of Stacks to convert
 * @returns {number|string} - converted amount in microSTX
 */
export const stxToUstx = (amountInStacks: string | number): number | string => {
  const value = Number(Number(amountInStacks) * 10 ** 6);

  if (isNaN(value)) {
    throw new Error("Invalid input amount");
  }

  return value;
};

export const btcToSats = (amount: number) => {
  return amount * 100000000;
};

export const satsToSbtc = (amount: number) => {
  return amount / 100000000;
};

export const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/**
 * @param stxAmount - the amount of stacks (or microstacks) to convert to a USD price
 * @param stxPrice - the current USD price of STX
 * @param isInMicroStacks - if true, the stxAmount is in microstacks
 *
 * @returns string - the formatted current USD price of the given STX
 */
export const getUsdValue = (
  stxAmount: number,
  stxPrice: number,
  isInMicroStacks = false
): string => {
  const amountInStx = isInMicroStacks
    ? (ustxToStx(stxAmount) as number)
    : stxAmount;
  const price = amountInStx * stxPrice;
  return price > 0 && price < 0.01 ? "<$0.01" : usdFormatter.format(price);
};

export const usdToStx = (usdAmount: number, stxPrice: number): number => {
  return usdAmount / stxPrice;
};

export const usdToSbtc = (usdAmount: number, sbtcPrice: number): number => {
  return usdAmount / sbtcPrice;
};

export interface PriceData {
  stx: number;
  sbtc: number;
}

export const DEFAULT_SBTC_TO_USTX_RATE = 100;

export function parseRawTokenAmount(amount: number | string | null | undefined): number {
  if (typeof amount === "number") {
    return Number.isFinite(amount) ? amount : 0;
  }
  if (typeof amount === "string") {
    const parsed = Number.parseInt(amount, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function getMixedFundingUsdValue(
  stxAmount: number | string | null | undefined,
  sbtcAmount: number | string | null | undefined,
  prices?: Partial<PriceData> | null
): number | null {
  const stxPrice = prices?.stx;
  const sbtcPrice = prices?.sbtc;
  if (!stxPrice || !sbtcPrice) return null;

  const stxRaw = parseRawTokenAmount(stxAmount);
  const sbtcRaw = parseRawTokenAmount(sbtcAmount);
  return Number(ustxToStx(stxRaw)) * stxPrice + satsToSbtc(sbtcRaw) * sbtcPrice;
}

export function getMixedFundingSortValue(
  stxAmount: number | string | null | undefined,
  sbtcAmount: number | string | null | undefined,
  prices?: Partial<PriceData> | null
): number {
  const usdValue = getMixedFundingUsdValue(stxAmount, sbtcAmount, prices);
  if (usdValue !== null) return usdValue;

  return (
    parseRawTokenAmount(stxAmount) +
    parseRawTokenAmount(sbtcAmount) * DEFAULT_SBTC_TO_USTX_RATE
  );
}

const getCurrentPrices = async () =>
  fetch(
    "https://api.coingecko.com/api/v3/simple/price?ids=blockstack,bitcoin&vs_currencies=usd"
  )
    .then((res) => res.json())
    .then((data) => ({ stx: data?.blockstack?.usd, sbtc: data?.bitcoin?.usd }));

export const useCurrentPrices = (options?: UseQueryOptions<PriceData>) =>
  useQuery<PriceData>({
    queryKey: ["current-stx-price"],
    queryFn: getCurrentPrices,
    staleTime: 30 * 60 * 1000,
    retry: false,
    ...options,
  });
