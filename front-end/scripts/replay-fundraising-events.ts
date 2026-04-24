/**
 * Rebuild `fundraising_events` from stored `chainhook_deliveries` payloads
 * using the same extraction + event_uid rules as POST /api/chainhook.
 *
 * Usage (from front-end/):
 *   npx tsx scripts/replay-fundraising-events.ts --dry-run
 *   npx tsx scripts/replay-fundraising-events.ts
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import pg from "pg";
import { extractFundraisingEvents, toJsonbSafe } from "../src/lib/chainhook";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "../.env.local") });
config({ path: path.join(__dirname, "../.env") });

const INSERT_SQL = `
  INSERT INTO fundraising_events
    (event_uid, event_name, campaign_id, donor, owner, beneficiary, token, amount, ts, txid, block_height, contract_identifier, raw)
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
  ON CONFLICT (event_uid) DO NOTHING
`;

type Row = { id: string; payload: unknown };

function parseArgs() {
  const args = process.argv.slice(2);
  return { dryRun: args.includes("--dry-run") || args.includes("-n") };
}

function requireDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url || !String(url).trim()) {
    throw new Error(
      "DATABASE_URL is required (set in .env.local or the environment)."
    );
  }
  return url;
}

async function main() {
  const { dryRun } = parseArgs();
  const expected = process.env.EXPECTED_CONTRACT_IDENTIFIER;
  const db = new pg.Pool({
    connectionString: requireDatabaseUrl(),
    max: 1,
    idleTimeoutMillis: 120_000,
    connectionTimeoutMillis: 30_000,
  });

  const deliveries = await db.query<Row>(
    `SELECT id::text, payload FROM chainhook_deliveries ORDER BY id ASC`
  );

  const totalDeliveries = deliveries.rowCount ?? 0;
  let extractedCount = 0;
  let insertedCount = 0;

  if (dryRun) {
    for (const row of deliveries.rows) {
      const payload =
        row.payload && typeof row.payload === "object"
          ? row.payload
          : JSON.parse(String(row.payload));
      const events = extractFundraisingEvents(payload, {
        expectedContractIdentifier: expected,
      });
      extractedCount += events.length;
    }
    // eslint-disable-next-line no-console
    console.log(
      `chainhook_deliveries: ${totalDeliveries} row(s) → ${extractedCount} extracted fundraising event(s) (with current event_uid rules)`
    );
    // eslint-disable-next-line no-console
    console.log("Dry run: no TRUNCATE, no INSERT. Remove --dry-run to apply.");
    await db.end();
    return;
  }

  // One long BEGIN…COMMIT can hit serverless/Neon idling or transaction time limits. Use
  // autocommit: TRUNCATE then each INSERT commits immediately (same connection, no open txn).
  const client = await db.connect();
  try {
    await client.query("TRUNCATE TABLE fundraising_events RESTART IDENTITY");
    for (const row of deliveries.rows) {
      const payload =
        row.payload && typeof row.payload === "object"
          ? row.payload
          : JSON.parse(String(row.payload));
      const events = extractFundraisingEvents(payload, {
        expectedContractIdentifier: expected,
      });
      extractedCount += events.length;
      for (const ev of events) {
        const result = await client.query(INSERT_SQL, [
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
          toJsonbSafe(ev.raw),
        ]);
        insertedCount += result.rowCount ?? 0;
      }
    }
  } finally {
    client.release();
  }

  // eslint-disable-next-line no-console
  console.log(
    `Done. Replayed ${totalDeliveries} delivery(ies) → ${extractedCount} extracted event(s), inserted ${insertedCount} row(s) into fundraising_events.`
  );
  await db.end();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
