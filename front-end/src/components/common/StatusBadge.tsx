"use client";

import { Badge, BadgeProps } from "@chakra-ui/react";

export type CampaignStatus = "active" | "ended" | "cancelled" | "withdrawn";

interface StatusBadgeProps extends Omit<BadgeProps, "variant"> {
  status: CampaignStatus;
  size?: "sm" | "md" | "lg";
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
  withdrawn: {
    label: "Funded ✓",
    colorScheme: "teal",
    variant: "withdrawn",
  },
};

const sizeStyles = {
  sm: { px: 2, py: 0.5, fontSize: "2xs" },
  md: { px: 3, py: 1, fontSize: "xs" },
  lg: { px: 4, py: 1.5, fontSize: "sm" },
};

/**
 * Determines campaign status from campaign data.
 */
export function getCampaignStatus(campaign: {
  isCancelled: boolean;
  isWithdrawn: boolean;
  isExpired: boolean;
}): CampaignStatus {
  if (campaign.isCancelled) return "cancelled";
  if (campaign.isWithdrawn) return "withdrawn";
  if (campaign.isExpired) return "ended";
  return "active";
}

/**
 * Status badge component with color-coded indicators for campaign status.
 */
export function StatusBadge({
  status,
  size = "md",
  ...props
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeStyle = sizeStyles[size];

  return (
    <Badge
      colorScheme={config.colorScheme}
      borderRadius="full"
      textTransform="uppercase"
      fontWeight="600"
      letterSpacing="0.05em"
      {...sizeStyle}
      {...props}
    >
      {config.label}
    </Badge>
  );
}

export default StatusBadge;
