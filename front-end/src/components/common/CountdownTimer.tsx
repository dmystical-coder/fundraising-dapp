"use client";

import { useEffect, useState } from "react";
import { HStack, Text, TextProps, Box, Icon } from "@chakra-ui/react";
import { TimeIcon } from "@chakra-ui/icons";

interface CountdownTimerProps extends Omit<TextProps, "children"> {
  endAt: number; // Unix timestamp in seconds
  size?: "sm" | "md" | "lg";
  showIcon?: boolean;
  onExpire?: () => void;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  totalSeconds: number;
}

const sizeStyles = {
  sm: { fontSize: "xs", spacing: 1, iconSize: 3 },
  md: { fontSize: "sm", spacing: 2, iconSize: 4 },
  lg: { fontSize: "lg", spacing: 2, iconSize: 5 },
};

/**
 * Calculates time remaining until a given timestamp.
 */
function calculateTimeRemaining(endAt: number): TimeRemaining {
  const now = Math.floor(Date.now() / 1000);
  const totalSeconds = endAt - now;

  if (totalSeconds <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isExpired: true,
      totalSeconds: 0,
    };
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days,
    hours,
    minutes,
    seconds,
    isExpired: false,
    totalSeconds,
  };
}

/**
 * Formats a number with leading zero if needed.
 */
function pad(num: number): string {
  return num.toString().padStart(2, "0");
}

/**
 * Gets urgency color based on time remaining.
 */
function getUrgencyColor(remaining: TimeRemaining): string {
  if (remaining.isExpired) return "gray.500";
  if (remaining.totalSeconds < 3600) return "error.500"; // < 1 hour
  if (remaining.totalSeconds < 86400) return "warning.500"; // < 1 day
  if (remaining.days < 3) return "warning.400"; // < 3 days
  return "gray.600";
}

/**
 * Live countdown timer component.
 */
export function CountdownTimer({
  endAt,
  size = "md",
  showIcon = true,
  onExpire,
  ...props
}: CountdownTimerProps) {
  const [remaining, setRemaining] = useState(() => calculateTimeRemaining(endAt));
  const styles = sizeStyles[size];

  useEffect(() => {
    // Initial calculation
    setRemaining(calculateTimeRemaining(endAt));

    // Update every second
    const interval = setInterval(() => {
      const newRemaining = calculateTimeRemaining(endAt);
      setRemaining(newRemaining);

      if (newRemaining.isExpired && onExpire) {
        onExpire();
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endAt, onExpire]);

  const urgencyColor = getUrgencyColor(remaining);

  if (remaining.isExpired) {
    return (
      <HStack spacing={styles.spacing}>
        {showIcon && (
          <Icon as={TimeIcon} boxSize={styles.iconSize} color="gray.400" />
        )}
        <Text
          fontSize={styles.fontSize}
          color="gray.500"
          fontWeight="500"
          {...props}
        >
          Campaign Ended
        </Text>
      </HStack>
    );
  }

  // Format based on remaining time
  let timeDisplay: string;
  if (remaining.days > 0) {
    timeDisplay = `${remaining.days}d ${remaining.hours}h ${remaining.minutes}m`;
  } else if (remaining.hours > 0) {
    timeDisplay = `${remaining.hours}h ${pad(remaining.minutes)}m ${pad(remaining.seconds)}s`;
  } else {
    timeDisplay = `${remaining.minutes}m ${pad(remaining.seconds)}s`;
  }

  return (
    <HStack spacing={styles.spacing}>
      {showIcon && (
        <Icon
          as={TimeIcon}
          boxSize={styles.iconSize}
          color={urgencyColor}
        />
      )}
      <Text
        fontSize={styles.fontSize}
        fontWeight="600"
        color={urgencyColor}
        fontFamily="mono"
        {...props}
      >
        {timeDisplay}
      </Text>
    </HStack>
  );
}

/**
 * Static time remaining display (no live updates).
 */
interface TimeRemainingDisplayProps extends Omit<TextProps, "children"> {
  endAt: number;
  size?: "sm" | "md" | "lg";
}

export function TimeRemainingDisplay({
  endAt,
  size = "md",
  ...props
}: TimeRemainingDisplayProps) {
  const remaining = calculateTimeRemaining(endAt);
  const styles = sizeStyles[size];
  const urgencyColor = getUrgencyColor(remaining);

  if (remaining.isExpired) {
    return (
      <Text fontSize={styles.fontSize} color="gray.500" {...props}>
        Ended
      </Text>
    );
  }

  let text: string;
  if (remaining.days > 7) {
    text = `${Math.ceil(remaining.days / 7)} weeks left`;
  } else if (remaining.days > 0) {
    text = `${remaining.days} day${remaining.days > 1 ? "s" : ""} left`;
  } else if (remaining.hours > 0) {
    text = `${remaining.hours} hour${remaining.hours > 1 ? "s" : ""} left`;
  } else {
    text = `${remaining.minutes} min${remaining.minutes > 1 ? "s" : ""} left`;
  }

  return (
    <Text fontSize={styles.fontSize} color={urgencyColor} fontWeight="500" {...props}>
      {text}
    </Text>
  );
}

export default CountdownTimer;
