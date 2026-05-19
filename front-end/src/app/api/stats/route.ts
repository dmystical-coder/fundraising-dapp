import { NextResponse } from "next/server";
import { listAllCampaigns } from "@/lib/fundraising-reads";
import { fetchAllEvents } from "@/lib/contract-events";

// Stats lag chain state by at most a minute. Donation events change at
// human-typing speed, not block speed, so a 60s revalidate window is
// invisible to users and protects against bursty refreshes hammering Hiro.
export const revalidate = 60;

export async function GET() {
  try {
    const [campaigns, events] = await Promise.all([
      listAllCampaigns(),
      fetchAllEvents(),
    ]);

    // total_campaigns counts every campaign id the contract has issued
    // (including cancelled ones, matching the previous SQL semantics).
    const total_campaigns = campaigns.length;

    // campaigns_funded = count of campaigns where the beneficiary has
    // already withdrawn. Read from live contract state.
    const campaigns_funded = campaigns.filter((c) => c.isWithdrawn).length;

    // The contract zeroes totalStx/totalSbtc on withdraw, so historical
    // totals must come from events.
    let total_stx_raised = BigInt(0);
    let total_sbtc_raised = BigInt(0);
    let total_donations = 0;
    const donors = new Set<string>();

    for (const ev of events) {
      if (ev.name === "donated-stx") {
        total_stx_raised += ev.amount;
        total_donations += 1;
        donors.add(ev.donor);
      } else if (ev.name === "donated-sbtc") {
        total_sbtc_raised += ev.amount;
        total_donations += 1;
        donors.add(ev.donor);
      }
    }

    return NextResponse.json({
      stats: {
        total_campaigns,
        campaigns_funded,
        total_stx_raised: total_stx_raised.toString(),
        total_sbtc_raised: total_sbtc_raised.toString(),
        unique_donors: donors.size,
        total_donations,
      },
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    return NextResponse.json({ error: "Stats fetch failed" }, { status: 500 });
  }
}
