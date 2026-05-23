import { NextRequest, NextResponse } from "next/server";
import { listAllCampaigns } from "@/lib/fundraising-reads";
import { fetchAllEvents } from "@/lib/contract-events";

// Unique supporter count for an owner across all of their campaigns.
export const revalidate = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ principal: string }> }
) {
  const { principal: owner } = await params;

  try {
    const [chainCampaigns, events] = await Promise.all([
      listAllCampaigns(),
      fetchAllEvents(),
    ]);

    const mineIds = new Set(
      chainCampaigns
        .filter((c) => c.owner === owner)
        .map((c) => Number(c.id))
    );

    const supporters = new Set<string>();
    for (const ev of events) {
      if (ev.name !== "donated-stx" && ev.name !== "donated-sbtc") continue;
      if (!mineIds.has(Number(ev.campaignId))) continue;
      supporters.add(ev.donor.toLowerCase());
    }

    return NextResponse.json({ unique_supporters: supporters.size });
  } catch (err) {
    console.error("Error fetching owner supporters:", err);
    return NextResponse.json(
      { error: "Owner supporters fetch failed" },
      { status: 500 }
    );
  }
}

