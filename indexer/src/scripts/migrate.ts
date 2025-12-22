import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "../env.js";
import { createDbPool } from "../db.js";

const env = loadEnv();
const db = createDbPool(env.DATABASE_URL);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const migrationsDir = path.join(__dirname, "..", "..", "migrations");
  const files = (await fs.readdir(migrationsDir))
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  for (const file of files) {
    const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
    // eslint-disable-next-line no-console
    console.log(`Applying ${file}...`);
    await db.query(sql);
  }

  await db.end();
}

main().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  try {
    await db.end();
  } catch {}
  process.exit(1);
});
