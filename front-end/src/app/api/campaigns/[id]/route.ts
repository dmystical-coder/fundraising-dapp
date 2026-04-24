import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
    const db = getDb();
    const result = await db.query(
      `
      SELECT 
        fe.campaign_id,
        MAX(CASE WHEN event_name = 'campaign-created' THEN fe.owner END) as owner,
        MAX(CASE WHEN event_name = 'campaign-created' THEN beneficiary END) as beneficiary,
        COUNT(CASE WHEN event_name LIKE 'donated-%' THEN 1 END)::int as donation_count,
        COUNT(DISTINCT donor) FILTER (WHERE event_name LIKE 'donated-%' AND donor IS NOT NULL)::int as donor_count,
        COALESCE(SUM(CASE WHEN event_name = 'donated-stx' THEN amount ELSE 0 END), 0)::text as total_stx,
        COALESCE(SUM(CASE WHEN event_name = 'donated-sbtc' THEN amount ELSE 0 END), 0)::text as total_sbtc,
        BOOL_OR(event_name = 'campaign-cancelled') as is_cancelled,
        BOOL_OR(event_name = 'campaign-withdrawn') as is_withdrawn,
        MIN(fe.inserted_at) as created_at,
        MAX(cm.title) as title,
        MAX(cm.description) as description
      FROM fundraising_events fe
      LEFT JOIN campaign_metadata cm ON fe.campaign_id = cm.campaign_id
      WHERE fe.campaign_id = $1
      GROUP BY fe.campaign_id
      `,
      [campaignId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign: result.rows[0] });
  } catch (err) {
    console.error("Error fetching campaign:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
