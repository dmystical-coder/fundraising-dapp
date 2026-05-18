import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const db = getDb();
    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT campaign_id) FILTER (WHERE event_name = 'campaign-created')::int as total_campaigns,
        COUNT(DISTINCT campaign_id) FILTER (WHERE event_name = 'campaign-withdrawn')::int as campaigns_funded,
        COALESCE(SUM(CASE WHEN event_name = 'donated-stx' THEN amount ELSE 0 END), 0)::text as total_stx_raised,
        COALESCE(SUM(CASE WHEN event_name = 'donated-sbtc' THEN amount ELSE 0 END), 0)::text as total_sbtc_raised,
        COUNT(DISTINCT donor) FILTER (WHERE event_name LIKE 'donated-%')::int as unique_donors,
        COUNT(*) FILTER (WHERE event_name LIKE 'donated-%')::int as total_donations
      FROM fundraising_events
    `);
    return NextResponse.json({ stats: result.rows[0] });
  } catch (err) {
    console.error("Error fetching stats:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
