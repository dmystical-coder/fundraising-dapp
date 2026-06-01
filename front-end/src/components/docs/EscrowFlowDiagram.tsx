"use client";

import { Box, Heading, SimpleGrid, Text, VStack } from "@chakra-ui/react";

/**
 * Schematic, blueprint-style explainer for the campaign-milestones escrow.
 * Rendered on the app's signature dark feature panel (echoing HowItWorksSection)
 * so it reads as the in-house "one big diagram" moment of the docs page.
 *
 * Flow: creator deposits own STX -> split into equal tranches -> donors vote
 * (weighted by their contribution, capped) -> creator claims a tranche once
 * its vote weight clears the threshold.
 */

const PANEL_BG = "#0D0F1A";
const CARD_BG = "rgba(255,255,255,0.04)";
const BORDER = "rgba(255,255,255,0.08)";
const VIOLET = "#A78BFA";
const TEAL = "#2DD4BF";
const INK_HI = "#F3F4F6";
const INK_LO = "#9CA3AF";
const INK_FAINT = "#6B7280";

interface FlowStep {
  n: number;
  title: string;
  body: string;
  glyph: React.ReactNode;
  accent: string;
}

/* Minimal line-art glyphs, single stroke weight, blueprint feel. */
const stroke = (color: string) => ({
  fill: "none",
  stroke: color,
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

const DepositGlyph = () => (
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    {/* wallet */}
    <rect x="6" y="12" width="20" height="16" rx="3" {...stroke(VIOLET)} />
    <path d="M6 17 H26" {...stroke(VIOLET)} />
    <circle cx="21.5" cy="22.5" r="1.6" {...stroke(VIOLET)} />
    {/* arrow out + coin */}
    <path d="M29 20 H37 M34 17 l3 3 -3 3" {...stroke(TEAL)} />
  </svg>
);

const SplitGlyph = () => (
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    {/* vault box */}
    <rect x="7" y="9" width="26" height="22" rx="3" {...stroke(VIOLET)} />
    {/* tranche divisions */}
    <path d="M7 16 H33 M7 23 H33" {...stroke(VIOLET)} opacity={0.55} />
    <path d="M20 9 V31" {...stroke(VIOLET)} opacity={0.55} />
  </svg>
);

const VoteGlyph = () => (
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    {/* ballot */}
    <rect x="9" y="14" width="22" height="16" rx="2.5" {...stroke(VIOLET)} />
    <path d="M9 20 H31" {...stroke(VIOLET)} opacity={0.55} />
    {/* weighted check */}
    <path d="M14 23.5 l3 3 6 -7" {...stroke(TEAL)} />
    {/* drop slot */}
    <path d="M16 14 V11 a4 4 0 0 1 8 0 v3" {...stroke(VIOLET)} />
  </svg>
);

const ClaimGlyph = () => (
  <svg viewBox="0 0 40 40" width="40" height="40" aria-hidden="true">
    {/* open padlock */}
    <rect x="11" y="19" width="18" height="13" rx="2.5" {...stroke(TEAL)} />
    <path d="M15 19 v-3 a5 5 0 0 1 9 -3" {...stroke(TEAL)} />
    <circle cx="20" cy="25" r="1.8" {...stroke(TEAL)} />
    <path d="M20 26.8 V29" {...stroke(TEAL)} />
  </svg>
);

const steps: FlowStep[] = [
  {
    n: 1,
    title: "Creator deposits",
    body: "The creator locks their own STX into the escrow and chooses how many tranches (1–4) to split it into.",
    glyph: <DepositGlyph />,
    accent: VIOLET,
  },
  {
    n: 2,
    title: "Split into tranches",
    body: "The deposit is divided into equal tranches. Each one is released independently — none of it is withdrawable up front.",
    glyph: <SplitGlyph />,
    accent: VIOLET,
  },
  {
    n: 3,
    title: "Donors vote",
    body: "Campaign donors vote to release a tranche. Each vote is weighted by their STX contribution, capped at 100 STX so no whale dominates.",
    glyph: <VoteGlyph />,
    accent: VIOLET,
  },
  {
    n: 4,
    title: "Creator claims",
    body: "Once a tranche's vote weight clears the threshold the creator committed to, they can claim exactly that tranche — and only that tranche.",
    glyph: <ClaimGlyph />,
    accent: TEAL,
  },
];

export function EscrowFlowDiagram() {
  return (
    <Box
      bg={PANEL_BG}
      borderWidth="1px"
      borderColor={BORDER}
      borderRadius={{ base: "2xl", md: "3xl" }}
      overflow="hidden"
      px={{ base: 5, md: 8 }}
      py={{ base: 7, md: 9 }}
    >
      <VStack align="start" spacing={2} mb={{ base: 6, md: 8 }}>
        <Box
          display="inline-flex"
          alignItems="center"
          px={3}
          py={1}
          borderRadius="full"
          borderWidth="1px"
          borderStyle="dashed"
          borderColor="primary.500"
        >
          <Text
            sx={{
              fontSize: "10px",
              letterSpacing: "0.12em",
              color: VIOLET,
              fontWeight: 700,
              textTransform: "uppercase",
            }}
          >
            Escrow flow
          </Text>
        </Box>
        <Heading
          as="h3"
          sx={{
            fontSize: { base: "20px", md: "24px" },
            fontWeight: 800,
            color: INK_HI,
            letterSpacing: "-0.02em",
          }}
        >
          How a tranche gets released
        </Heading>
        <Text sx={{ fontSize: { base: "13px", md: "14px" }, color: INK_LO, maxW: "60ch", lineHeight: 1.7 }}>
          Milestone escrow is opt-in. The money is the creator&apos;s own — funds
          move out of the escrow only when donors vote to approve each step.
        </Text>
      </VStack>

      <Box position="relative">
        {/* connecting spine across the row on desktop */}
        <Box
          aria-hidden="true"
          display={{ base: "none", lg: "block" }}
          position="absolute"
          top="28px"
          left="12.5%"
          right="12.5%"
          height="1px"
          bgGradient={`linear(to-r, ${VIOLET}33, ${VIOLET}33, ${TEAL}55)`}
        />
        <SimpleGrid columns={{ base: 1, sm: 2, lg: 4 }} spacing={{ base: 4, md: 5 }} position="relative">
          {steps.map((s) => (
            <VStack key={s.n} align="start" spacing={3.5}>
              <Box
                w={14}
                h={14}
                borderRadius="2xl"
                bg={CARD_BG}
                borderWidth="1px"
                borderColor={BORDER}
                display="flex"
                alignItems="center"
                justifyContent="center"
                position="relative"
                zIndex={1}
              >
                {s.glyph}
                <Box
                  position="absolute"
                  top="-7px"
                  right="-7px"
                  w={5}
                  h={5}
                  borderRadius="full"
                  bg={PANEL_BG}
                  borderWidth="1px"
                  borderColor={s.accent}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                >
                  <Text sx={{ fontSize: "10px", fontWeight: 800, color: s.accent, fontFamily: "mono" }}>
                    {s.n}
                  </Text>
                </Box>
              </Box>
              <Box>
                <Heading
                  as="h4"
                  sx={{ fontSize: "15px", fontWeight: 700, color: INK_HI, mb: "6px", lineHeight: 1.3 }}
                >
                  {s.title}
                </Heading>
                <Text sx={{ fontSize: "13px", color: INK_LO, lineHeight: 1.65 }}>{s.body}</Text>
              </Box>
            </VStack>
          ))}
        </SimpleGrid>
      </Box>

      <Box
        mt={{ base: 6, md: 8 }}
        pt={{ base: 5, md: 6 }}
        borderTopWidth="1px"
        borderColor={BORDER}
      >
        <Text sx={{ fontSize: "12px", color: INK_FAINT, lineHeight: 1.7 }}>
          <Box as="span" sx={{ color: VIOLET, fontWeight: 700, fontFamily: "mono" }}>
            Note —
          </Box>{" "}
          tranche IDs are zero-indexed, and the per-tranche payout is{" "}
          <Box as="span" sx={{ fontFamily: "mono", color: INK_LO }}>
            floor(deposit ÷ tranche-count)
          </Box>
          . Any remainder from uneven division stays permanently locked, so the
          app nudges creators toward evenly divisible deposits.
        </Text>
      </Box>
    </Box>
  );
}

export default EscrowFlowDiagram;
