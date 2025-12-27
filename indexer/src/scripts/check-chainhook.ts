import "dotenv/config";
import { CHAINHOOKS_BASE_URL, ChainhooksClient } from "@hirosystems/chainhooks-client";
import { z } from "zod";

const EnvSchema = z.object({
  CHAINHOOKS_NETWORK: z.enum(["mainnet", "testnet"]).optional(),
  CHAINHOOKS_BASE_URL: z.string().url().optional(),
  CHAINHOOKS_API_KEY: z.string().min(1).optional(),
  CHAINHOOKS_JWT: z.string().min(1).optional(),
  CHAINHOOK_UUID: z.string().min(1).optional(),
}).passthrough();

async function main() {
  const env = EnvSchema.parse(process.env);
  const network = env.CHAINHOOKS_NETWORK ?? "mainnet";
  const baseUrl = env.CHAINHOOKS_BASE_URL ?? CHAINHOOKS_BASE_URL[network];

  if (!env.CHAINHOOKS_API_KEY && !env.CHAINHOOKS_JWT) {
    throw new Error("Missing CHAINHOOKS_API_KEY or CHAINHOOKS_JWT.");
  }

  const uuid = env.CHAINHOOK_UUID || process.argv[2];
  if (!uuid) {
    throw new Error("Missing CHAINHOOK_UUID env var or command line argument.");
  }

  const client = new ChainhooksClient({
    baseUrl,
    apiKey: env.CHAINHOOKS_API_KEY,
    jwt: env.CHAINHOOKS_JWT,
  });

  console.log(`Checking status for Chainhook UUID: ${uuid}...`);
  try {
    const hook = await client.getChainhook(uuid);
    console.log("Hook Status:", JSON.stringify(hook.status, null, 2));
    
    // Also try to list events? The client might support it but it's not in the simple interface
    // But we can check if there are recent occurrences in the status
  } catch (error) {
    console.error("Failed to fetch chainhook status:", error);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
