import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

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
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  try {
    const db = getDb();
    const result = await db.query(
      `
      SELECT 
        donor,
        COALESCE(SUM(CASE WHEN event_name = 'donated-stx' THEN amount ELSE 0 END), 0)::text as total_stx,
        COALESCE(SUM(CASE WHEN event_name = 'donated-sbtc' THEN amount ELSE 0 END), 0)::text as total_sbtc,
        COUNT(*)::int as donation_count
      FROM fundraising_events
      WHERE campaign_id = $1 AND event_name LIKE 'donated-%' AND donor IS NOT NULL
      GROUP BY donor
      ORDER BY SUM(CASE WHEN event_name = 'donated-stx' THEN amount ELSE 0 END) DESC,
               SUM(CASE WHEN event_name = 'donated-sbtc' THEN amount ELSE 0 END) DESC
      LIMIT $2
      `,
      [campaignId, limit]
    );
    return NextResponse.json({ leaderboard: result.rows });
  } catch (err) {
    console.error("Error fetching leaderboard:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
