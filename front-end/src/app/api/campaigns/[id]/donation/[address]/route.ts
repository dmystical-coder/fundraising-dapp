import { NextRequest, NextResponse } from "next/server";
import { getStxDonation, getSbtcDonation } from "@/lib/fundraising-reads";

export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; address: string }> }
) {
  const { id, address } = await params;
  const campaignId = parseInt(id, 10);

  if (isNaN(campaignId)) {
    return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
  }

  const donor = decodeURIComponent(address);

  try {
    const [stxAmount, sbtcAmount] = await Promise.all([
      getStxDonation(campaignId, donor),
      getSbtcDonation(campaignId, donor),
    ]);

    return NextResponse.json({
      stxAmount: stxAmount.toString(),
      sbtcAmount: sbtcAmount.toString(),
    });
  } catch (err) {
    console.error("Error fetching donation amounts:", err);
    return NextResponse.json({ error: "Failed to fetch donation" }, { status: 500 });
  }
}
