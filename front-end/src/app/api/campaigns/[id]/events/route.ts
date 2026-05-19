import { NextRequest, NextResponse } from "next/server";
import {
  fetchEventsForCampaign,
  enrichEventsWithTxData,
} from "@/lib/contract-events";

// Per-campaign feed for the detail page. Client refetches at 15s; we
// cache at the same cadence. fetchEventsForCampaign bounds the scan
// at the campaign's creation event, so cost is proportional to the
// campaign's age, not the contract's.
export const revalidate = 15;

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
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    const all = await fetchEventsForCampaign(campaignId);
    const slice = all.slice(0, limit);
    const enriched = await enrichEventsWithTxData(slice);

    const events = enriched.map((ev) => ({
      event_name: ev.name,
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
      token:
        ev.name === "donated-stx"
          ? "stx"
          : ev.name === "donated-sbtc"
          ? "sbtc"
          : null,
      txid: ev.txid,
      block_height: ev.blockHeight?.toString() ?? null,
      inserted_at: ev.blockTime,
    }));

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Error fetching campaign events:", err);
    return NextResponse.json(
      { error: "Campaign events fetch failed" },
      { status: 500 }
    );
  }
}
