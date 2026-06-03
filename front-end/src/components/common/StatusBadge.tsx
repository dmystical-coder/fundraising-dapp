"use client";

import { Badge, BadgeProps } from "@chakra-ui/react";

export type CampaignStatus = "active" | "ended" | "cancelled";

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: CampaignStatus;
  size?: "sm" | "md" | "lg";
  overrides?: {
    label?: string;
    colorScheme?: string;
  };
}

const statusConfig: Record<
  CampaignStatus,
  { label: string; colorScheme: string; variant: string }
> = {
  active: {
    label: "Active",
    colorScheme: "green",
    variant: "active",
  },
  ended: {
    label: "Ended",
    colorScheme: "gray",
    variant: "ended",
  },
  cancelled: {
    label: "Cancelled",
    colorScheme: "red",
    variant: "cancelled",
  },
};

const sizeStyles = {
  sm: { px: 2, py: 0.5, fontSize: "2xs", maxW: "96px" },
  md: { px: 3, py: 1, fontSize: "xs", maxW: "128px" },
  lg: { px: 4, py: 1.5, fontSize: "sm", maxW: "160px" },
};

/**
 * Determines campaign status from campaign data. Collapses to three display
 * states: a campaign whose funds were withdrawn is treated as "ended" (it's
 * concluded) — the raw isWithdrawn flag is still used elsewhere for stats.
 */
export function getCampaignStatus(campaign: {
  isCancelled: boolean;
  isWithdrawn: boolean;
  isExpired: boolean;
}): CampaignStatus {
  if (campaign.isCancelled) return "cancelled";
  if (campaign.isWithdrawn || campaign.isExpired) return "ended";
  return "active";
}

/**
 * Status badge component with color-coded indicators for campaign status.
 */
export function StatusBadge({
  status,
  size = "md",
  overrides,
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeStyle = sizeStyles[size];
  const label = overrides?.label || config.label;

  return (
    <Badge
      colorScheme={overrides?.colorScheme || config.colorScheme}
      variant="subtle"
      borderRadius="full"
      textTransform="uppercase"
      fontWeight="600"
      letterSpacing="0.05em"
      whiteSpace="nowrap"
      overflow="hidden"
      textOverflow="ellipsis"
      title={label}
      aria-label={`Campaign status: ${label}`}
      {...sizeStyle}
      {...props}
    >
      {label}
    </Badge>
  );
}

export default StatusBadge;
