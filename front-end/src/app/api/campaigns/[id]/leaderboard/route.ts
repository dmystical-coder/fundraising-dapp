import { NextRequest, NextResponse } from "next/server";
import { fetchEventsForCampaign } from "@/lib/contract-events";

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

    // Match the previous SQL ordering: STX-heavy donors first, sBTC as
    // tie-breaker. donation_count is informational.
    const leaderboard = Array.from(byDonor.entries())
      .sort(([, a], [, b]) => {
        if (a.total_stx !== b.total_stx) return a.total_stx < b.total_stx ? 1 : -1;
        if (a.total_sbtc !== b.total_sbtc) return a.total_sbtc < b.total_sbtc ? 1 : -1;
        return 0;
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
