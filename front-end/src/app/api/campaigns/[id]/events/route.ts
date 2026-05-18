import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    const db = getDb();
    const result = await db.query(
      `
      SELECT 
        event_name, donor, owner, beneficiary, amount, token,
        txid, block_height, inserted_at
      FROM fundraising_events
      WHERE campaign_id = $1
      ORDER BY inserted_at DESC
      LIMIT $2
      `,
      [campaignId, limit]
    );
    return NextResponse.json({ events: result.rows });
  } catch (err) {
    console.error("Error fetching campaign events:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
