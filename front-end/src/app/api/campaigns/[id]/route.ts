import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCampaignInfo } from "@/lib/fundraising-reads";
import { fetchAllEvents, filterByCampaign } from "@/lib/contract-events";

export const revalidate = 30;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaignId = parseInt(id, 10);
  if (isNaN(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
  }

  try {
    const [chain, events, metadataResult] = await Promise.all([
      getCampaignInfo(campaignId),
      fetchAllEvents(),
      getDb().query<{ title: string | null; description: string | null }>(
        `SELECT title, description FROM campaign_metadata WHERE campaign_id = $1`,
        [campaignId]
      ),
    ]);

    if (!chain) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Event-derived totals preserve history after withdraw (when the
    // contract zeroes totalStx/totalSbtc). Donor count must come from
    // events — the contract doesn't track donor uniqueness.
    const ours = filterByCampaign(events, campaignId);
    let event_total_stx = BigInt(0);
    let event_total_sbtc = BigInt(0);
    let donation_count = 0;
    const donors = new Set<string>();
    for (const ev of ours) {
      if (ev.name === "donated-stx") {
        event_total_stx += ev.amount;
        donation_count += 1;
        donors.add(ev.donor);
      } else if (ev.name === "donated-sbtc") {
        event_total_sbtc += ev.amount;
        donation_count += 1;
        donors.add(ev.donor);
      }
    }

    const meta = metadataResult.rows[0] ?? { title: null, description: null };
    const created_at = new Date(Number(chain.createdAt) * 1000).toISOString();

    return NextResponse.json({
      campaign: {
        campaign_id: campaignId,
        owner: chain.owner,
        beneficiary: chain.beneficiary,
        goal: chain.goal.toString(),
        donation_count,
        donor_count: donors.size,
        total_stx: event_total_stx.toString(),
        total_sbtc: event_total_sbtc.toString(),
        is_cancelled: chain.isCancelled,
        is_withdrawn: chain.isWithdrawn,
        is_expired: chain.isExpired,
        end_at: chain.endAt.toString(),
        created_at,
        title: meta.title,
        description: meta.description,
      },
    });
  } catch (err) {
    console.error("Error fetching campaign:", err);
    return NextResponse.json({ error: "Campaign fetch failed" }, { status: 500 });
  }
}
