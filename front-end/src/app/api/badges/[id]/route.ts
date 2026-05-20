import { NextRequest, NextResponse } from "next/server";
import { getBadgeMetadata, tierLabel } from "@/lib/donor-badges-reads";

// The contract's token-uri template is "…/api/badges/{id}.json" — clients
// substitute {id} with the integer token id, so this route receives a param
// like "42.json". Strip the suffix to get the numeric id.
function parseTokenId(raw: string): bigint | null {
  const stripped = raw.replace(/\.json$/i, "");
  const n = parseInt(stripped, 10);
  if (isNaN(n) || n < 1 || String(n) !== stripped) return null;
  return BigInt(n);
}

const TIER_DESCRIPTION: Record<string, string> = {
  bronze: "donated at least 1 STX equivalent",
  silver: "donated at least 10 STX equivalent",
  gold:   "donated at least 100 STX equivalent",
};

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tokenId = parseTokenId(id);
  if (tokenId === null) {
    return NextResponse.json({ error: "invalid token id" }, { status: 400 });
  }

  let metadata;
  try {
    metadata = await getBadgeMetadata(tokenId);
  } catch {
    return NextResponse.json({ error: "chain read failed" }, { status: 502 });
  }

  if (!metadata) {
    return NextResponse.json({ error: "token not found" }, { status: 404 });
  }

  const tier = tierLabel(metadata.tier);
  if (tier === "none") {
    return NextResponse.json({ error: "token not found" }, { status: 404 });
  }

  const origin = new URL(req.url).origin;
  const body = {
    name: `FundStacks ${capitalize(tier)} Donor Badge #${tokenId}`,
    description:
      `Soulbound on-chain proof that this principal ${TIER_DESCRIPTION[tier]} ` +
      `to FundStacks campaign #${metadata.campaignId}. Non-transferable (SIP-009).`,
    image: `${origin}/badges/${tier}.svg`,
    attributes: [
      { trait_type: "Tier",        value: capitalize(tier) },
      { trait_type: "Campaign ID", value: metadata.campaignId.toString() },
      { trait_type: "Soulbound",   value: "true" },
    ],
  };

  // Tier upgrades are infrequent; 60 s fresh + 5 min stale keeps explorers
  // responsive while tolerating the occasional badge-upgraded event.
  return NextResponse.json(body, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
