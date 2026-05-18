import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ principal: string }> }
) {
  const { principal: donor } = await params;
  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  try {
    const db = getDb();
    const result = await db.query(
      `
      SELECT 
        campaign_id, event_name, amount, txid, block_height, inserted_at
      FROM fundraising_events
      WHERE donor = $1 AND event_name LIKE 'donated-%'
      ORDER BY inserted_at DESC
      LIMIT $2
      `,
      [donor, limit]
    );
    return NextResponse.json({ donations: result.rows });
  } catch (err) {
    console.error("Error fetching donor donations:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
