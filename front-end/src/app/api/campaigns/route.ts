import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listAllCampaigns } from "@/lib/fundraising-reads";
import { fetchAllEvents } from "@/lib/contract-events";

// Aggregate listing for the campaigns index page. Pulls chain state for
// every campaign, walks the contract's event history once to compute
// per-campaign totals + donor uniqueness (donor counts aren't tracked
// on-chain), and joins off-chain title/description from Postgres. Heavy
// on first hit; the 30s revalidate window covers normal browse traffic.
export const revalidate = 30;

interface PerCampaignAgg {
  donation_count: number;
  donors: Set<string>;
  total_stx: bigint;
  total_sbtc: bigint;
}

export async function GET() {
  try {
    const [chainCampaigns, events, metaRows] = await Promise.all([
      listAllCampaigns(),
      fetchAllEvents(),
      getDb().query<{
        campaign_id: number;
        title: string | null;
        description: string | null;
        cover_url: string | null;
      }>(`SELECT campaign_id, title, description, cover_url FROM campaign_metadata`),
    ]);

    const aggByCampaign = new Map<number, PerCampaignAgg>();
    for (const ev of events) {
      if (ev.name !== "donated-stx" && ev.name !== "donated-sbtc") continue;
      const key = Number(ev.campaignId);
      const agg = aggByCampaign.get(key) ?? {
        donation_count: 0,
        donors: new Set<string>(),
        total_stx: BigInt(0),
        total_sbtc: BigInt(0),
      };
      agg.donation_count += 1;
      agg.donors.add(ev.donor);
      if (ev.name === "donated-stx") agg.total_stx += ev.amount;
      else agg.total_sbtc += ev.amount;
      aggByCampaign.set(key, agg);
    }

    const metaByCampaign = new Map(
      metaRows.rows.map((r) => [Number(r.campaign_id), r])
    );

    // chain order is id ASC; the previous SQL returned id DESC, so reverse.
    const campaigns = [...chainCampaigns]
      .sort((a, b) => Number(b.id) - Number(a.id))
      .map((c) => {
        const id = Number(c.id);
        const agg = aggByCampaign.get(id);
        const meta = metaByCampaign.get(id);
        return {
          campaign_id: id,
          owner: c.owner,
          beneficiary: c.beneficiary,
          donation_count: agg?.donation_count ?? 0,
          donor_count: agg?.donors.size ?? 0,
          total_stx: (agg?.total_stx ?? BigInt(0)).toString(),
          total_sbtc: (agg?.total_sbtc ?? BigInt(0)).toString(),
          is_cancelled: c.isCancelled,
          is_withdrawn: c.isWithdrawn,
          created_at: new Date(Number(c.createdAt) * 1000).toISOString(),
          title: meta?.title ?? null,
          description: meta?.description ?? null,
          cover_url: meta?.cover_url ?? null,
        };
      });

    return NextResponse.json({ campaigns });
  } catch (err) {
    console.error("Error fetching campaigns:", err);
    return NextResponse.json(
      { error: "Campaigns fetch failed" },
      { status: 500 }
    );
  }
}
