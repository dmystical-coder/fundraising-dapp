import { NextRequest, NextResponse } from "next/server";
import { fetchEvents, enrichEventsWithTxData } from "@/lib/contract-events";

// Activity feed is the platform's "what's happening now" view. Refreshes
// fast on the client (15s) and surfaces the newest contract activity;
// route-level cache mirrors the client cadence so a wave of viewers
// doesn't fan out to Hiro.
export const revalidate = 15;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  try {
    const events = await fetchEvents({ limit });
    const enriched = await enrichEventsWithTxData(events);

    const activity = enriched.map((ev) => ({
      event_name: ev.name,
      campaign_id: Number(ev.campaignId),
      donor:
        ev.name === "donated-stx" ||
        ev.name === "donated-sbtc" ||
        ev.name === "refunded"
          ? ev.donor
          : null,
      owner: ev.name === "campaign-created" ? ev.owner : null,
      beneficiary: ev.name === "campaign-created" ? ev.beneficiary : null,
      amount:
        ev.name === "donated-stx" || ev.name === "donated-sbtc"
          ? ev.amount.toString()
          : null,
      txid: ev.txid,
      block_height: ev.blockHeight?.toString() ?? null,
      inserted_at: ev.blockTime,
    }));

    return NextResponse.json({ activity });
  } catch (err) {
    console.error("Error fetching activity:", err);
    return NextResponse.json({ error: "Activity fetch failed" }, { status: 500 });
  }
}
