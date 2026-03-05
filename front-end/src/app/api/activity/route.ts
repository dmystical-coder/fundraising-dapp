import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

  try {
    const db = getDb();
    const result = await db.query(
      `
      SELECT 
        event_name, campaign_id, donor, owner, beneficiary, 
        amount, txid, block_height, inserted_at
      FROM fundraising_events
      ORDER BY inserted_at DESC
      LIMIT $1
      `,
      [limit]
    );
    return NextResponse.json({ activity: result.rows });
  } catch (err) {
    console.error("Error fetching activity:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
