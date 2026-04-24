import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const result = await db.query(`
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
      WHERE fe.campaign_id IS NOT NULL
      GROUP BY fe.campaign_id
      ORDER BY fe.campaign_id DESC
    `);
    return NextResponse.json({ campaigns: result.rows });
  } catch (err) {
    console.error("Error fetching campaigns:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
