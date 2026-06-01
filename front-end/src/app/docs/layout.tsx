import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Docs | FundStacks",
  description:
    "Understand FundStacks end to end — how donations, refunds, donor badges, reward tokens, and donor-governed milestone escrow work on-chain. Written for donors, creators, and developers.",
  openGraph: {
    title: "FundStacks Docs — how the protocol works",
    description:
      "A field guide to crowdfunding on Stacks: donations in STX and sBTC, soulbound donor badges, reward tokens, and donor-voted milestone escrow.",
    type: "article",
  },
};

export default function DocsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
