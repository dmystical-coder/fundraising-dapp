"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Container,
  Grid,
  GridItem,
  Heading,
  HStack,
  Link,
  SimpleGrid,
  Stack,
  Text,
  VStack,
} from "@chakra-ui/react";
import { ArrowForwardIcon } from "@chakra-ui/icons";
import NextLink from "next/link";
import { EscrowFlowDiagram } from "@/components/docs/EscrowFlowDiagram";
import {
  CAMPAIGN_MILESTONES_CONTRACT,
  DONOR_BADGES_CONTRACT,
  FEE_SPLITTER_CONTRACT,
  FUNDRAISING_CONTRACT,
  FUNDSTACKS_REWARDS_CONTRACT,
} from "@/constants/contracts";

/* ─── Section model ─────────────────────────────────────────────────────── */

interface DocSection {
  id: string;
  label: string;
  tag: string;
}

const SECTIONS: DocSection[] = [
  { id: "overview", label: "Overview", tag: "Start here" },
  { id: "donors", label: "For donors", tag: "Donor" },
  { id: "creators", label: "For creators", tag: "Creator" },
  { id: "milestones", label: "Milestone escrow", tag: "Concept" },
  { id: "developers", label: "For developers", tag: "Technical" },
];

const DEPLOYER = FUNDRAISING_CONTRACT.address ?? "";

const contractId = (c: { address: string | undefined; name: string }) =>
  `${c.address}.${c.name}`;
const explorerHref = (id: string) =>
  `https://explorer.hiro.so/txid/${id}?chain=mainnet`;

/* ─── Scrollspy ─────────────────────────────────────────────────────────── */

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0]);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-96px 0px -65% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

/* ─── Reusable primitives ───────────────────────────────────────────────── */

function SectionShell({
  id,
  eyebrow,
  title,
  lede,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  lede?: string;
  children: React.ReactNode;
}) {
  return (
    <Box as="section" id={id} scrollMarginTop="96px" pt={{ base: 10, md: 14 }}>
      <Text
        sx={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "text.accent",
          fontFamily: "mono",
          mb: 2,
        }}
      >
        {eyebrow}
      </Text>
      <Heading
        as="h2"
        sx={{
          fontSize: { base: "26px", md: "32px" },
          fontWeight: 800,
          letterSpacing: "-0.025em",
          color: "text.primary",
          lineHeight: 1.15,
          textWrap: "balance",
        }}
      >
        {title}
      </Heading>
      {lede && (
        <Text
          mt={3}
          sx={{
            fontSize: { base: "15px", md: "17px" },
            color: "text.secondary",
            lineHeight: 1.7,
            maxW: "62ch",
          }}
        >
          {lede}
        </Text>
      )}
      <Box mt={{ base: 5, md: 7 }}>{children}</Box>
    </Box>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="2xl"
      p={{ base: 5, md: 6 }}
      transition="border-color 0.15s ease, box-shadow 0.15s ease"
      _hover={{ borderColor: "border.accent", boxShadow: "0 1px 2px rgba(15,23,43,0.04)" }}
    >
      <Heading
        as="h3"
        sx={{ fontSize: "17px", fontWeight: 700, color: "text.primary", mb: 2 }}
      >
        {title}
      </Heading>
      <Text sx={{ fontSize: "14px", color: "text.secondary", lineHeight: 1.7 }}>
        {children}
      </Text>
    </Box>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <Box
      bg="bg.accentSubtle"
      borderWidth="1px"
      borderColor="border.accent"
      borderLeftWidth="3px"
      borderRadius="lg"
      px={{ base: 4, md: 5 }}
      py={{ base: 3.5, md: 4 }}
    >
      <Text sx={{ fontSize: "14px", color: "text.primary", lineHeight: 1.7 }}>
        {children}
      </Text>
    </Box>
  );
}

/* Numbered step row, used in donor/creator tracks. */
function StepRow({
  n,
  title,
  children,
  last,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <HStack align="start" spacing={4}>
      <VStack spacing={0} flexShrink={0} alignSelf="stretch">
        <Box
          w={8}
          h={8}
          borderRadius="full"
          bg="bg.accentSubtle"
          borderWidth="1px"
          borderColor="border.accent"
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text
            sx={{
              fontSize: "12px",
              fontWeight: 800,
              color: "text.accent",
              fontFamily: "mono",
            }}
          >
            {n}
          </Text>
        </Box>
        {!last && <Box flex="1" w="1px" bg="border.default" my={1} aria-hidden />}
      </VStack>
      <Box pb={last ? 0 : 6}>
        <Heading
          as="h3"
          sx={{ fontSize: "16px", fontWeight: 700, color: "text.primary", mb: 1.5 }}
        >
          {title}
        </Heading>
        <Text sx={{ fontSize: "14px", color: "text.secondary", lineHeight: 1.7 }}>
          {children}
        </Text>
      </Box>
    </HStack>
  );
}

/* SST-style code card — syntax colors confined to code only. */
const SYN = {
  fn: "#8844ae",
  param: "#096e72",
  type: "#3b61b0",
  str: "#984e4d",
  comment: "#767682",
};

function CodeCard({ children }: { children: React.ReactNode }) {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.subtle"
      borderRadius="lg"
      px={{ base: 4, md: 5 }}
      py={{ base: 4, md: 4 }}
      overflowX="auto"
      sx={{
        fontFamily: "mono",
        fontSize: "13px",
        lineHeight: 1.85,
        whiteSpace: "pre",
        letterSpacing: "-0.01em",
      }}
    >
      {children}
    </Box>
  );
}

interface FnDef {
  name: string;
  args: string;
  returns: string;
  desc: string;
}

function FunctionCard({ fn }: { fn: FnDef }) {
  return (
    <Box
      bg="bg.surface"
      borderWidth="1px"
      borderColor="border.default"
      borderRadius="lg"
      px={{ base: 4, md: 5 }}
      py={4}
    >
      <Box
        sx={{
          fontFamily: "mono",
          fontSize: "13px",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          mb: 2,
        }}
      >
        <Box as="span" sx={{ color: SYN.comment }}>
          (
        </Box>
        <Box as="span" sx={{ color: SYN.fn, fontWeight: 600 }}>
          {fn.name}
        </Box>
        {fn.args && (
          <Box as="span" sx={{ color: SYN.param }}>
            {" "}
            {fn.args}
          </Box>
        )}
        <Box as="span" sx={{ color: SYN.comment }}>
          )
        </Box>
        <Box as="span" sx={{ color: SYN.type }}>
          {" "}
          → {fn.returns}
        </Box>
      </Box>
      <Text sx={{ fontSize: "13.5px", color: "text.secondary", lineHeight: 1.65 }}>
        {fn.desc}
      </Text>
    </Box>
  );
}

/* ─── Data ──────────────────────────────────────────────────────────────── */

const CONTRACTS: { c: { address: string | undefined; name: string }; role: string }[] = [
  {
    c: FUNDRAISING_CONTRACT,
    role: "Campaign lifecycle — create, cancel, donate (STX/sBTC), withdraw, refund. The source of truth for campaign state.",
  },
  {
    c: DONOR_BADGES_CONTRACT,
    role: "Soulbound SIP-009 NFT. Donors claim a Bronze / Silver / Gold badge based on cumulative contribution.",
  },
  {
    c: FUNDSTACKS_REWARDS_CONTRACT,
    role: "SIP-010 reward token. Issued to donors with a rate keyed to goal progress.",
  },
  {
    c: FEE_SPLITTER_CONTRACT,
    role: "Routes a configurable platform fee to a treasury, with an optional per-campaign charity split.",
  },
  {
    c: CAMPAIGN_MILESTONES_CONTRACT,
    role: "Opt-in trust escrow. Creator deposits funds, donors vote (weighted by contribution) to release tranches.",
  },
  {
    c: { address: DEPLOYER, name: "donation-source-trait" },
    role: "Trait the badge/reward contracts read donation data through, so fundraising stays the single source of truth.",
  },
  {
    c: { address: DEPLOYER, name: "fundstacks-source-trait" },
    role: "Companion source trait used by the milestone escrow to read each donor's contribution for vote weight.",
  },
];

const PUBLIC_FNS: FnDef[] = [
  {
    name: "create-escrow",
    args: "source campaign-id amount tranche-count release-threshold",
    returns: "(ok bool)",
    desc: "Creator deposits their own STX and splits it into 1–4 equal tranches. Caller must be the campaign owner; the owner principal is captured at create time.",
  },
  {
    name: "vote-release",
    args: "source campaign-id tranche-id",
    returns: "(ok uint)",
    desc: "A donor votes to release a tranche. Vote weight = min(STX contribution, 100 STX). One vote per donor per tranche. Returns the weight added.",
  },
  {
    name: "claim-tranche",
    args: "campaign-id tranche-id",
    returns: "(ok uint)",
    desc: "Owner claims a tranche once its vote weight clears the release threshold. Pays exactly the tranche amount; returns the amount paid.",
  },
];

const READONLY_FNS =
  "get-escrow-info · get-tranche-info · has-voted · get-vote-cap · get-tranche-bounds";

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function DocsPage() {
  const ids = SECTIONS.map((s) => s.id);
  const active = useActiveSection(ids);

  return (
    <Box bg="bg.canvas">
      {/* Hero */}
      <Box bg="heroBg" borderBottomWidth="1px" borderColor="border.default">
        <Container maxW="container.xl" px={{ base: 4, md: 8 }} py={{ base: 12, md: 16 }}>
          <VStack align="start" spacing={5} maxW="44rem">
            <Box
              display="inline-flex"
              alignItems="center"
              px={3}
              py={1}
              borderRadius="full"
              bg="bg.surface"
              borderWidth="1px"
              borderColor="border.accent"
            >
              <Text
                sx={{
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  color: "text.accent",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  fontFamily: "mono",
                }}
              >
                Documentation
              </Text>
            </Box>
            <Heading
              as="h1"
              sx={{
                fontSize: { base: "34px", md: "52px" },
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.05,
                color: "text.primary",
                textWrap: "balance",
              }}
            >
              How FundStacks works,{" "}
              <Box as="span" color="text.accent">
                end to end
              </Box>
            </Heading>
            <Text
              sx={{
                fontSize: { base: "16px", md: "19px" },
                color: "text.secondary",
                lineHeight: 1.6,
                maxW: "54ch",
              }}
            >
              Crowdfunding on Stacks, the Bitcoin L2. Funds are held and settled
              on-chain — no platform custody. Here&apos;s exactly what happens to
              your money, whether you&apos;re donating, raising, or building on top.
            </Text>
            <HStack spacing={2} pt={1} flexWrap="wrap">
              {SECTIONS.map((s) => (
                <Link
                  key={s.id}
                  href={`#${s.id}`}
                  sx={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "text.secondary",
                    bg: "bg.surface",
                    borderWidth: "1px",
                    borderColor: "border.default",
                    borderRadius: "full",
                    px: 3.5,
                    py: 1.5,
                    transition: "all 0.15s ease",
                    _hover: {
                      textDecoration: "none",
                      color: "text.accent",
                      borderColor: "border.accent",
                      bg: "bg.accentSubtle",
                    },
                  }}
                >
                  {s.label}
                </Link>
              ))}
            </HStack>
          </VStack>
        </Container>
      </Box>

      {/* Body: sticky nav + content */}
      <Container maxW="container.xl" px={{ base: 4, md: 8 }} pb={{ base: 16, md: 24 }}>
        <Grid templateColumns={{ base: "1fr", lg: "220px 1fr" }} gap={{ base: 0, lg: 12 }}>
          {/* Sticky anchor nav */}
          <GridItem display={{ base: "none", lg: "block" }}>
            <Box as="nav" aria-label="On this page" position="sticky" top="96px" pt={14}>
              <Text
                sx={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "text.tertiary",
                  mb: 3,
                  pl: 3,
                }}
              >
                On this page
              </Text>
              <VStack align="stretch" spacing={1}>
                {SECTIONS.map((s) => {
                  const isActive = active === s.id;
                  return (
                    <Link
                      key={s.id}
                      href={`#${s.id}`}
                      aria-current={isActive ? "true" : undefined}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        fontSize: "14px",
                        fontWeight: isActive ? 700 : 500,
                        color: isActive ? "text.accent" : "text.secondary",
                        borderLeftWidth: "2px",
                        borderColor: isActive ? "primary.500" : "border.default",
                        pl: 3,
                        py: 1.5,
                        transition: "all 0.15s ease",
                        _hover: {
                          textDecoration: "none",
                          color: "text.accent",
                          borderColor: "border.accent",
                        },
                      }}
                    >
                      {s.label}
                    </Link>
                  );
                })}
              </VStack>
            </Box>
          </GridItem>

          {/* Content */}
          <GridItem minW={0}>
            {/* Overview */}
            <SectionShell
              id="overview"
              eyebrow="Start here"
              title="What FundStacks is"
              lede="Creators launch campaigns with a goal and a deadline. Donors contribute in STX or sBTC. A Clarity contract holds the funds, records every donation, and enforces the outcome — no off-chain ledger pretending to be the truth."
            >
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
                <InfoCard title="On-chain end to end">
                  Donations, refunds, and withdrawals are public contract
                  functions gated by campaign state — not platform code. Nothing
                  off-chain can move the funds.
                </InfoCard>
                <InfoCard title="Dual-asset">
                  A single campaign accepts both STX and sBTC. The contract tracks
                  each donor&apos;s per-asset contribution and refunds in kind.
                </InfoCard>
                <InfoCard title="Composable">
                  Donor badges, reward tokens, fee splitting, and milestone escrow
                  are separate contracts that read the core — they never modify it.
                </InfoCard>
              </SimpleGrid>
            </SectionShell>

            {/* Donors */}
            <SectionShell
              id="donors"
              eyebrow="Donor"
              title="What happens to your money"
              lede="When you donate, your contribution is recorded on-chain against the campaign and the asset you sent. That record is what powers refunds, badges, and reward tokens — you never have to trust a dashboard."
            >
              <VStack align="stretch" spacing={0}>
                <StepRow n={1} title="You donate in STX or sBTC">
                  Your wallet sends the asset directly to the campaign contract.
                  Your donor → amount record is stored per campaign, per asset.
                </StepRow>
                <StepRow n={2} title="You can claim a soulbound badge">
                  Based on your cumulative contribution, you can mint a
                  non-transferable Bronze, Silver, or Gold badge — public proof of
                  support that can&apos;t be resold.
                </StepRow>
                <StepRow n={3} title="You earn reward tokens">
                  Donors receive FundStacks reward tokens, with the rate keyed to
                  goal progress — early support of underfunded campaigns earns more.
                </StepRow>
                <StepRow n={4} title="If the campaign is cancelled, you refund" last>
                  Should the creator cancel before withdrawal, you call{" "}
                  <Box as="span" sx={{ fontFamily: "mono", color: "text.accent" }}>
                    refund
                  </Box>{" "}
                  and recover your exact contribution, in the same asset you gave.
                </StepRow>
              </VStack>
              <Box mt={6}>
                <Callout>
                  Your money is only ever in two places: the campaign contract
                  (until the deadline) or back in your wallet (on refund). The
                  beneficiary can only withdraw after the deadline passes.
                </Callout>
              </Box>
            </SectionShell>

            {/* Creators */}
            <SectionShell
              id="creators"
              eyebrow="Creator"
              title="Launching and getting paid"
              lede="You set the terms up front, and the contract enforces them. You can take the funds in one withdrawal, or opt into milestone escrow to release them gradually as donors approve."
            >
              <VStack align="stretch" spacing={0}>
                <StepRow n={1} title="Create a campaign">
                  Pick a goal, a deadline, and a beneficiary principal. The
                  contract assigns a sequential campaign ID. Title and description
                  live off-chain since they don&apos;t need consensus.
                </StepRow>
                <StepRow n={2} title="Donors contribute">
                  Contributions accrue on-chain in STX and sBTC. Progress toward
                  your goal is always readable directly from the contract.
                </StepRow>
                <StepRow n={3} title="Withdraw after the deadline">
                  Once the deadline passes, the beneficiary withdraws the balance.
                  Cancelling before withdrawal opens refunds to every donor.
                </StepRow>
                <StepRow n={4} title="Optional: route funds into milestone escrow" last>
                  Instead of taking everything at once, you can lock a portion in
                  the escrow and let donors vote to release it in tranches — a
                  trust signal that gives supporters leverage after the campaign
                  closes.
                </StepRow>
              </VStack>
            </SectionShell>

            {/* Milestone escrow — centerpiece */}
            <SectionShell
              id="milestones"
              eyebrow="Concept"
              title="Milestone escrow, explained"
              lede="The most misunderstood part of the protocol, so here it is plainly: milestone escrow holds the creator's own STX and releases it tranche by tranche only as donors vote to approve. It is accountability, not a funding mechanism."
            >
              <EscrowFlowDiagram />
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4} mt={5}>
                <InfoCard title="Whose money is locked?">
                  The creator&apos;s own. The escrow never touches campaign
                  donations or checks the campaign&apos;s balance — the creator
                  deposits funds they already control.
                </InfoCard>
                <InfoCard title="Why weighted voting?">
                  Vote weight equals each donor&apos;s STX contribution, capped at
                  100 STX. That ties influence to real, on-chain support while
                  blunting whale dominance.
                </InfoCard>
              </SimpleGrid>
            </SectionShell>

            {/* Developers */}
            <SectionShell
              id="developers"
              eyebrow="Technical"
              title="For developers"
              lede="Seven Clarity contracts, all live on Stacks mainnet under one deployer. The companions compose around the core fundraising contract and read its state through source traits."
            >
              {/* Architecture table */}
              <Box
                bg="bg.surface"
                borderWidth="1px"
                borderColor="border.default"
                borderRadius="2xl"
                overflow="hidden"
              >
                <Box
                  px={{ base: 4, md: 5 }}
                  py={3}
                  borderBottomWidth="1px"
                  borderColor="border.default"
                  bg="bg.surfaceAlt"
                >
                  <Text
                    sx={{
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "text.secondary",
                      fontFamily: "mono",
                    }}
                  >
                    {DEPLOYER}
                  </Text>
                </Box>
                <VStack align="stretch" spacing={0} divider={<Box borderBottomWidth="1px" borderColor="border.subtle" />}>
                  {CONTRACTS.map(({ c, role }) => {
                    const id = contractId(c);
                    return (
                      <Box key={c.name} px={{ base: 4, md: 5 }} py={4}>
                        <Stack
                          direction={{ base: "column", md: "row" }}
                          spacing={{ base: 1, md: 6 }}
                          align={{ md: "baseline" }}
                        >
                          <Link
                            href={explorerHref(id)}
                            isExternal
                            flexShrink={0}
                            sx={{
                              fontFamily: "mono",
                              fontSize: "13.5px",
                              fontWeight: 600,
                              color: "text.accent",
                              minW: { md: "13rem" },
                              _hover: { textDecoration: "underline" },
                            }}
                          >
                            {c.name}
                          </Link>
                          <Text sx={{ fontSize: "13.5px", color: "text.secondary", lineHeight: 1.6 }}>
                            {role}
                          </Text>
                        </Stack>
                      </Box>
                    );
                  })}
                </VStack>
              </Box>

              {/* Tranche math */}
              <Heading
                as="h3"
                sx={{ fontSize: "18px", fontWeight: 700, color: "text.primary", mt: 10, mb: 3 }}
              >
                Tranche math
              </Heading>
              <CodeCard>
                <Box as="span" sx={{ color: SYN.comment }}>
                  {"; an evenly divisible deposit\n"}
                </Box>
                {"deposit            = 100 STX\n"}
                {"tranche-count      = 4\n"}
                <Box as="span" sx={{ color: SYN.type }}>
                  {"tranche-amount"}
                </Box>
                {"     = "}
                <Box as="span" sx={{ color: SYN.fn }}>
                  {"floor"}
                </Box>
                {"(100 / 4) = 25 STX   "}
                <Box as="span" sx={{ color: SYN.comment }}>
                  {"; paid per claim\n"}
                </Box>
                {"release-threshold  = 60 STX          "}
                <Box as="span" sx={{ color: SYN.comment }}>
                  {"; vote weight needed\n\n"}
                </Box>
                <Box as="span" sx={{ color: SYN.comment }}>
                  {"; uneven deposit -> remainder is locked dust\n"}
                </Box>
                {"10 STX / 3 tranches = 3 STX each, "}
                <Box as="span" sx={{ color: SYN.str }}>
                  {"1 STX locked"}
                </Box>
              </CodeCard>

              {/* Function reference */}
              <Heading
                as="h3"
                sx={{ fontSize: "18px", fontWeight: 700, color: "text.primary", mt: 10, mb: 3 }}
              >
                campaign-milestones — public functions
              </Heading>
              <VStack align="stretch" spacing={3}>
                {PUBLIC_FNS.map((fn) => (
                  <FunctionCard key={fn.name} fn={fn} />
                ))}
              </VStack>

              <Box mt={4}>
                <Text sx={{ fontSize: "13px", color: "text.tertiary", lineHeight: 1.7 }}>
                  <Box as="span" sx={{ fontWeight: 700, color: "text.secondary" }}>
                    Read-only:
                  </Box>{" "}
                  <Box as="span" sx={{ fontFamily: "mono", color: "text.secondary" }}>
                    {READONLY_FNS}
                  </Box>
                </Text>
              </Box>

              <Box mt={6}>
                <Callout>
                  Tranche IDs are zero-indexed — the contract asserts{" "}
                  <Box as="span" sx={{ fontFamily: "mono", color: "text.accent" }}>
                    (&lt; tranche-id tranche-count)
                  </Box>
                  , so valid IDs run 0 … (tranche-count − 1).
                </Callout>
              </Box>
            </SectionShell>

            {/* Closing CTA */}
            <Box
              mt={{ base: 14, md: 20 }}
              bg="bg.surface"
              borderWidth="1px"
              borderColor="border.default"
              borderRadius="2xl"
              boxShadow="0 1px 2px rgba(15,23,43,0.04)"
              p={{ base: 6, md: 9 }}
            >
              <Stack
                direction={{ base: "column", md: "row" }}
                align={{ md: "center" }}
                justify="space-between"
                spacing={5}
              >
                <Box>
                  <Heading
                    as="h2"
                    sx={{ fontSize: { base: "22px", md: "26px" }, fontWeight: 800, color: "text.primary", letterSpacing: "-0.02em" }}
                  >
                    Ready to dig in?
                  </Heading>
                  <Text mt={2} sx={{ fontSize: "15px", color: "text.secondary", lineHeight: 1.6, maxW: "46ch" }}>
                    Browse live campaigns, or start your own and try milestone
                    escrow for yourself.
                  </Text>
                </Box>
                <Stack
                  direction={{ base: "column", sm: "row" }}
                  spacing={3}
                  flexShrink={0}
                  w={{ base: "full", md: "auto" }}
                >
                  <Button
                    as={NextLink}
                    href="/campaigns"
                    colorScheme="primary"
                    size="lg"
                    rightIcon={<ArrowForwardIcon />}
                    fontWeight={700}
                    w={{ base: "full", sm: "auto" }}
                  >
                    Explore campaigns
                  </Button>
                  <Button
                    as={NextLink}
                    href="/campaigns/new"
                    variant="outline"
                    colorScheme="primary"
                    size="lg"
                    fontWeight={700}
                    w={{ base: "full", sm: "auto" }}
                  >
                    Start a campaign
                  </Button>
                </Stack>
              </Stack>
            </Box>
          </GridItem>
        </Grid>
      </Container>
    </Box>
  );
}
