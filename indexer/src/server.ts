import "dotenv/config";
import { createRequire } from "node:module";
import type { Request, Response } from "express";
import { loadEnv } from "./env.js";
import { createDbPool } from "./db.js";
import {
  computeEventUid,
  extractFundraisingEvents,
  extractTopLevelMeta,
} from "./chainhook.js";

const require = createRequire(import.meta.url);
// Express is CommonJS (`export =` in types). createRequire keeps TS happy in ESM.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require("express") as typeof import("express");

const env = loadEnv();
const db = createDbPool(env.DATABASE_URL);

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", async (_req: Request, res: Response) => {
  try {
    await db.query("select 1 as ok");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

app.post("/chainhook", async (req: Request, res: Response) => {
  if (env.CHAINHOOK_AUTH_TOKEN) {
    const auth = req.header("authorization");
    const expected = `Bearer ${env.CHAINHOOK_AUTH_TOKEN}`;
    if (auth !== expected) {
      res.status(401).json({ ok: false, error: "unauthorized" });
      return;
    }
  }

  const payload = req.body as unknown;

  // Always store the delivery (raw) for audit/debug.
  const meta = extractTopLevelMeta(payload);
  const deliveryUid = computeEventUid(payload);

  try {
    await db.query(
      `insert into chainhook_deliveries
        (hook_uuid, chain, network, action, block_height, txid, contract_identifier, event_uid, payload)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       on conflict (event_uid) do nothing`,
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

    // Best-effort extraction of fundraising events from print logs.
    const extracted = extractFundraisingEvents(payload, {
      expectedContractIdentifier: env.EXPECTED_CONTRACT_IDENTIFIER,
    });

    for (const ev of extracted) {
      await db.query(
        `insert into fundraising_events
          (event_uid, event_name, campaign_id, donor, owner, beneficiary, token, amount, ts, txid, block_height, contract_identifier, raw)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         on conflict (event_uid) do nothing`,
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

    res.json({ ok: true, deliveriesInserted: 1, extractedEvents: extracted.length });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

const port = env.PORT;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`chainhook indexer listening on :${port}`);
});
