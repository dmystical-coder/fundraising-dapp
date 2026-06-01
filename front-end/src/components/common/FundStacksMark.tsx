import { useId } from "react";

interface FundStacksMarkProps {
  size?: number;
}

/**
 * FundStacks brand mark — stacked layers of funds ascending to a teal cap,
 * on the violet brand tile. Inline SVG for crisp rendering at any size.
 * Mirrors public/fundstacks-logo.svg.
 */
export function FundStacksMark({ size = 32 }: FundStacksMarkProps) {
  const gradId = useId();
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      role="img"
      aria-label="FundStacks"
      style={{ flexShrink: 0, display: "block" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
      </defs>
      <rect width="256" height="256" rx="56" ry="56" fill={`url(#${gradId})`} />
      <rect x="50" y="156" width="156" height="40" rx="20" fill="#FFFFFF" fillOpacity="0.92" />
      <rect x="70" y="108" width="116" height="40" rx="20" fill="#5EEAD4" />
      <rect x="90" y="60" width="76" height="40" rx="20" fill="#14B8A6" />
    </svg>
  );
}

export default FundStacksMark;
