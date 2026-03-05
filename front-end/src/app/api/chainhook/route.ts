import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  computeEventUid,
  extractFundraisingEvents,
  extractTopLevelMeta,
} from "@/lib/chainhook";

export async function POST(request: NextRequest) {
  const authToken = process.env.CHAINHOOK_AUTH_TOKEN;
  if (authToken) {
    const auth = request.headers.get("authorization");
    const expected = `Bearer ${authToken}`;
    if (auth !== expected) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }
  }

  const payload = await request.json();
  const meta = extractTopLevelMeta(payload);
  const deliveryUid = computeEventUid(payload);
  const db = getDb();

  try {
    await db.query(
      `INSERT INTO chainhook_deliveries
        (hook_uuid, chain, network, action, block_height, txid, contract_identifier, event_uid, payload)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       ON CONFLICT (event_uid) DO NOTHING`,
      [
        meta.hookUuid ?? null,
        meta.chain ?? null,
        meta.network ?? null,
        meta.action ?? null,
        meta.blockHeight?.toString() ?? null,
        meta.txid ?? null,
        meta.contractIdentifier ?? null,
        deliveryUid,
        payload,
      ]
    );

    const extracted = extractFundraisingEvents(payload, {
      expectedContractIdentifier: process.env.EXPECTED_CONTRACT_IDENTIFIER,
    });

    for (const ev of extracted) {
      await db.query(
        `INSERT INTO fundraising_events
          (event_uid, event_name, campaign_id, donor, owner, beneficiary, token, amount, ts, txid, block_height, contract_identifier, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         ON CONFLICT (event_uid) DO NOTHING`,
        [
          ev.eventUid,
          ev.eventName,
          ev.campaignId?.toString() ?? null,
          ev.donor ?? null,
          ev.owner ?? null,
          ev.beneficiary ?? null,
          ev.token ?? null,
          ev.amount?.toString() ?? null,
          ev.ts?.toString() ?? null,
          ev.txid ?? null,
          ev.blockHeight?.toString() ?? null,
          ev.contractIdentifier ?? null,
          ev.raw,
        ]
      );
    }

    return NextResponse.json({
      ok: true,
      deliveriesInserted: 1,
      extractedEvents: extracted.length,
    });
  } catch (err) {
    console.error("Error processing chainhook:", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
