import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllEvents,
  filterByDonor,
  enrichEventsWithTxData,
} from "@/lib/contract-events";

// "My donations" for a single principal. The contract doesn't expose a
// per-donor view, so we walk the contract's event history once and
// filter client-side. Cached at the same cadence as the client (60s)
// so repeat refreshes don't re-scan.
export const revalidate = 60;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ principal: string }> }
) {
  const { principal: donor } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    const all = await fetchAllEvents();
    const mine = filterByDonor(all, donor).slice(0, limit);
    const enriched = await enrichEventsWithTxData(mine);

    const donations = enriched.map((ev) => ({
      campaign_id: Number(ev.campaignId),
      event_name: ev.name,
      amount: ev.amount.toString(),
      txid: ev.txid,
      inserted_at: ev.blockTime,
    }));

    return NextResponse.json({ donations });
  } catch (err) {
    console.error("Error fetching donor donations:", err);
    return NextResponse.json(
      { error: "Donor donations fetch failed" },
      { status: 500 }
    );
  }
}
