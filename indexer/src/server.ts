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

// CORS middleware for frontend access
app.use((_req: Request, res: Response, next: () => void) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (_req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  next();
});

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

    res.json({
      ok: true,
      deliveriesInserted: 1,
      extractedEvents: extracted.length,
    });
  } catch (err) {
    res.status(500).json({ ok: false });
  }
});

// ============================================================================
// REST API Endpoints for Frontend
// ============================================================================

/**
 * GET /api/campaigns
 * Returns all campaigns with aggregated stats from indexed events.
 */
app.get("/api/campaigns", async (_req: Request, res: Response) => {
  try {
    const result = await db.query(`
      SELECT 
        campaign_id,
        MAX(CASE WHEN event_name = 'campaign-created' THEN owner END) as owner,
        MAX(CASE WHEN event_name = 'campaign-created' THEN beneficiary END) as beneficiary,
        COUNT(CASE WHEN event_name LIKE 'donated-%' THEN 1 END)::int as donation_count,
        COALESCE(SUM(CASE WHEN event_name = 'donated-stx' THEN amount ELSE 0 END), 0)::text as total_stx,
        COALESCE(SUM(CASE WHEN event_name = 'donated-sbtc' THEN amount ELSE 0 END), 0)::text as total_sbtc,
        BOOL_OR(event_name = 'campaign-cancelled') as is_cancelled,
        BOOL_OR(event_name = 'campaign-withdrawn') as is_withdrawn,
        MIN(inserted_at) as created_at
      FROM fundraising_events
      WHERE campaign_id IS NOT NULL
      GROUP BY campaign_id
      ORDER BY campaign_id DESC
    `);
    res.json({ campaigns: result.rows });
  } catch (err) {
    console.error("Error fetching campaigns:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * GET /api/campaigns/:id
 * Returns details for a specific campaign.
 */
app.get("/api/campaigns/:id", async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id, 10);
  if (isNaN(campaignId)) {
    res.status(400).json({ error: "Invalid campaign ID" });
    return;
  }

  try {
    const result = await db.query(
      `
      SELECT 
        campaign_id,
        MAX(CASE WHEN event_name = 'campaign-created' THEN owner END) as owner,
        MAX(CASE WHEN event_name = 'campaign-created' THEN beneficiary END) as beneficiary,
        COUNT(CASE WHEN event_name LIKE 'donated-%' THEN 1 END)::int as donation_count,
        COALESCE(SUM(CASE WHEN event_name = 'donated-stx' THEN amount ELSE 0 END), 0)::text as total_stx,
        COALESCE(SUM(CASE WHEN event_name = 'donated-sbtc' THEN amount ELSE 0 END), 0)::text as total_sbtc,
        BOOL_OR(event_name = 'campaign-cancelled') as is_cancelled,
        BOOL_OR(event_name = 'campaign-withdrawn') as is_withdrawn,
        MIN(inserted_at) as created_at
      FROM fundraising_events
      WHERE campaign_id = $1
      GROUP BY campaign_id
    `,
      [campaignId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "Campaign not found" });
      return;
    }

    res.json({ campaign: result.rows[0] });
  } catch (err) {
    console.error("Error fetching campaign:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * GET /api/campaigns/:id/events
 * Returns event history for a specific campaign.
 */
app.get("/api/campaigns/:id/events", async (req: Request, res: Response) => {
  const campaignId = parseInt(req.params.id, 10);
  if (isNaN(campaignId)) {
    res.status(400).json({ error: "Invalid campaign ID" });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  try {
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
    res.json({ events: result.rows });
  } catch (err) {
    console.error("Error fetching campaign events:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * GET /api/campaigns/:id/leaderboard
 * Returns top donors for a specific campaign.
 */
app.get(
  "/api/campaigns/:id/leaderboard",
  async (req: Request, res: Response) => {
    const campaignId = parseInt(req.params.id, 10);
    if (isNaN(campaignId)) {
      res.status(400).json({ error: "Invalid campaign ID" });
      return;
    }

    const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);

    try {
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
      res.json({ leaderboard: result.rows });
    } catch (err) {
      console.error("Error fetching leaderboard:", err);
      res.status(500).json({ error: "Database error" });
    }
  }
);

/**
 * GET /api/activity
 * Returns recent activity feed across all campaigns.
 */
app.get("/api/activity", async (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  try {
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
    res.json({ activity: result.rows });
  } catch (err) {
    console.error("Error fetching activity:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * GET /api/donors/:principal/donations
 * Returns donation history for a specific donor.
 */
app.get(
  "/api/donors/:principal/donations",
  async (req: Request, res: Response) => {
    const donor = req.params.principal;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

    try {
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
      res.json({ donations: result.rows });
    } catch (err) {
      console.error("Error fetching donor donations:", err);
      res.status(500).json({ error: "Database error" });
    }
  }
);

/**
 * GET /api/stats
 * Returns platform-wide statistics.
 */
app.get("/api/stats", async (_req: Request, res: Response) => {
  try {
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
    res.json({ stats: result.rows[0] });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * GET /api/owner/:principal/campaigns
 * Returns campaigns created by a specific owner.
 */
app.get(
  "/api/owner/:principal/campaigns",
  async (req: Request, res: Response) => {
    const owner = req.params.principal;

    try {
      const result = await db.query(
        `
      SELECT 
        campaign_id,
        MAX(CASE WHEN event_name = 'campaign-created' THEN owner END) as owner,
        MAX(CASE WHEN event_name = 'campaign-created' THEN beneficiary END) as beneficiary,
        COUNT(CASE WHEN event_name LIKE 'donated-%' THEN 1 END)::int as donation_count,
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
      res.json({ campaigns: result.rows });
    } catch (err) {
      console.error("Error fetching owner campaigns:", err);
      res.status(500).json({ error: "Database error" });
    }
  }
);

const port = env.PORT;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`chainhook indexer listening on :${port}`);
});

