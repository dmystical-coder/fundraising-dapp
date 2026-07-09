import { NextRequest, NextResponse } from "next/server";
import { fetchEventsForCampaign } from "@/lib/contract-events";

const DEFAULT_SBTC_TO_USTX_RATE = BigInt(100);

function mixedFundingFallbackValue(row: {
  total_stx: bigint;
  total_sbtc: bigint;
}): bigint {
  return row.total_stx + row.total_sbtc * DEFAULT_SBTC_TO_USTX_RATE;
}

// Per-campaign donor leaderboard. Bounded scan (stops at the campaign's
// creation event), then groups donations by donor in memory. Cached at
// the client's refetch cadence (60s).
export const revalidate = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaignId = parseInt(id, 10);
  if (isNaN(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  try {
    const events = await fetchEventsForCampaign(campaignId);

    const byDonor = new Map<
      string,
      { total_stx: bigint; total_sbtc: bigint; donation_count: number }
    >();
    for (const ev of events) {
      if (ev.name !== "donated-stx" && ev.name !== "donated-sbtc") continue;
      const row = byDonor.get(ev.donor) ?? {
        total_stx: BigInt(0),
        total_sbtc: BigInt(0),
        donation_count: 0,
      };
      if (ev.name === "donated-stx") row.total_stx += ev.amount;
      else row.total_sbtc += ev.amount;
      row.donation_count += 1;
      byDonor.set(ev.donor, row);
    }

    // Use the same deterministic fallback rate as badge/reward previews:
    // 1 satoshi counts as 100 microSTX. The client re-sorts by live USD value
    // when prices are available.
    const leaderboard = Array.from(byDonor.entries())
      .sort(([, a], [, b]) => {
        const aValue = mixedFundingFallbackValue(a);
        const bValue = mixedFundingFallbackValue(b);
        if (aValue !== bValue) return aValue < bValue ? 1 : -1;
        return b.donation_count - a.donation_count;
      })
      .slice(0, limit)
      .map(([donor, row]) => ({
        donor,
        total_stx: row.total_stx.toString(),
        total_sbtc: row.total_sbtc.toString(),
        donation_count: row.donation_count,
      }));

    return NextResponse.json({ leaderboard });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    return NextResponse.json(
      { error: "Leaderboard fetch failed" },
      { status: 500 }
    );
  }
}
