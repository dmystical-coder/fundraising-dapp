import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ principal: string }> }
) {
  const { principal: owner } = await params;

  try {
    const db = getDb();
    const result = await db.query(
      `
      SELECT 
        campaign_id,
        MAX(CASE WHEN event_name = 'campaign-created' THEN owner END) as owner,
        MAX(CASE WHEN event_name = 'campaign-created' THEN beneficiary END) as beneficiary,
        COUNT(CASE WHEN event_name LIKE 'donated-%' THEN 1 END)::int as donation_count,
        COUNT(DISTINCT donor) FILTER (WHERE event_name LIKE 'donated-%' AND donor IS NOT NULL)::int as donor_count,
        COALESCE(SUM(CASE WHEN event_name = 'donated-stx' THEN amount ELSE 0 END), 0)::text as total_stx,
        COALESCE(SUM(CASE WHEN event_name = 'donated-sbtc' THEN amount ELSE 0 END), 0)::text as total_sbtc,
        BOOL_OR(event_name = 'campaign-cancelled') as is_cancelled,
        BOOL_OR(event_name = 'campaign-withdrawn') as is_withdrawn,
        MIN(inserted_at) as created_at
      FROM fundraising_events
      WHERE campaign_id IN (
        SELECT DISTINCT campaign_id FROM fundraising_events 
        WHERE event_name = 'campaign-created' AND owner = $1
      )
      GROUP BY campaign_id
      ORDER BY campaign_id DESC
      `,
      [owner]
    );
    return NextResponse.json({ campaigns: result.rows });
  } catch (err) {
    console.error("Error fetching owner campaigns:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
