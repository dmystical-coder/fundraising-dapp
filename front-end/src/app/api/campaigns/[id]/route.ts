import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCampaignInfo } from "@/lib/fundraising-reads";
import { fetchEventsForCampaign } from "@/lib/contract-events";

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
      fetchEventsForCampaign(campaignId),
      getDb().query<{ title: string | null; description: string | null; cover_url: string | null }>(
        `SELECT title, description, cover_url FROM campaign_metadata WHERE campaign_id = $1`,
        [campaignId]
      ),
    ]);

    if (!chain) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // donor_count and post-withdraw historical totals come from events.
    // Chain stays authoritative for the rest: donationCount is never
    // zeroed; totalStx/totalSbtc are zeroed on withdraw, so we fall
    // back to event sums only in that case.
    const donors = new Set<string>();
    let event_total_stx = BigInt(0);
    let event_total_sbtc = BigInt(0);
    for (const ev of events) {
      if (ev.name === "donated-stx") {
        donors.add(ev.donor);
        if (chain.isWithdrawn) event_total_stx += ev.amount;
      } else if (ev.name === "donated-sbtc") {
        donors.add(ev.donor);
        if (chain.isWithdrawn) event_total_sbtc += ev.amount;
      }
    }

    const total_stx = chain.isWithdrawn ? event_total_stx : chain.totalStx;
    const total_sbtc = chain.isWithdrawn ? event_total_sbtc : chain.totalSbtc;

    const meta = metadataResult.rows[0] ?? { title: null, description: null, cover_url: null };
    const created_at = new Date(Number(chain.createdAt) * 1000).toISOString();

    return NextResponse.json({
      campaign: {
        campaign_id: campaignId,
        owner: chain.owner,
        beneficiary: chain.beneficiary,
        goal: chain.goal.toString(),
        donation_count: Number(chain.donationCount),
        donor_count: donors.size,
        total_stx: total_stx.toString(),
        total_sbtc: total_sbtc.toString(),
        is_cancelled: chain.isCancelled,
        is_withdrawn: chain.isWithdrawn,
        is_expired: chain.isExpired,
        end_at: chain.endAt.toString(),
        created_at,
        title: meta.title,
        description: meta.description,
        cover_url: meta.cover_url,
      },
    });
  } catch (err) {
    console.error("Error fetching campaign:", err);
    return NextResponse.json({ error: "Campaign fetch failed" }, { status: 500 });
  }
}
