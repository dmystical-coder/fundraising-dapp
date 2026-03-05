import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const campaignId = parseInt(id, 10);
  if (isNaN(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
  }

  const body = await request.json();
  const { title, description, owner } = body as {
    title?: string;
    description?: string;
    owner?: string;
  };

  if (!title || !owner) {
    return NextResponse.json(
      { error: "Title and owner are required" },
      { status: 400 }
    );
  }

  try {
    const db = getDb();
    await db.query(
      `
      INSERT INTO campaign_metadata (campaign_id, owner, title, description)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (campaign_id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        updated_at = now()
      `,
      [campaignId, owner, title, description || ""]
    );

    return NextResponse.json({ ok: true, campaignId });
  } catch (err) {
    console.error("Error saving campaign metadata:", err);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }
}
