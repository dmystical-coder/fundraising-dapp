import "dotenv/config";

import {
  CHAINHOOKS_BASE_URL,
  ChainhooksClient,
  type ChainhookDefinition,
} from "@hirosystems/chainhooks-client";
import { z } from "zod";

const EnvSchema = z
  .object({
    CHAINHOOKS_NETWORK: z.enum(["mainnet", "testnet"]).optional(),
    CHAINHOOKS_BASE_URL: z.string().url().optional(),
    CHAINHOOKS_API_KEY: z.string().min(1).optional(),
    CHAINHOOKS_JWT: z.string().min(1).optional(),

    CHAINHOOKS_NAME: z.string().min(1).optional(),
    CHAINHOOKS_WEBHOOK_URL: z.string().url().optional(),

    EXPECTED_CONTRACT_IDENTIFIER: z.string().min(1).optional(),
    PORT: z.string().min(1).optional(),

    CHAINHOOKS_REPLACE_EXISTING: z.enum(["0", "1", "true", "false"]).optional(),
    CHAINHOOKS_START_BLOCK: z.string().regex(/^\d+$/).optional(),
  })
  .passthrough();

function normalizeReplaceExisting(value: string | undefined): boolean {
  if (!value) return false;
  return value === "1" || value === "true";
}

async function findExistingByName(
  client: ChainhooksClient,
  name: string,
  network: "mainnet" | "testnet"
) {
  const pageSize = 60;
  let offset = 0;

  while (true) {
    const page = await client.getChainhooks({ limit: pageSize, offset });
    for (const hook of page.results) {
      if (
        hook.definition?.chain === "stacks" &&
        hook.definition?.network === network &&
        hook.definition?.name === name
      ) {
        return hook;
      }
    }

    offset += pageSize;
    if (offset >= page.total) return null;
  }
}

async function main() {
  const env = EnvSchema.parse(process.env);

  const network: "mainnet" | "testnet" = env.CHAINHOOKS_NETWORK ?? "mainnet";
  const baseUrl = env.CHAINHOOKS_BASE_URL ?? CHAINHOOKS_BASE_URL[network];

  if (!env.CHAINHOOKS_API_KEY && !env.CHAINHOOKS_JWT) {
    throw new Error(
      "Missing CHAINHOOKS_API_KEY or CHAINHOOKS_JWT. One is required to use the Hiro Chainhooks API."
    );
  }

  const port = env.PORT ?? "4001";
  const webhookUrl =
    env.CHAINHOOKS_WEBHOOK_URL ?? `http://localhost:${port}/chainhook`;
  const name = env.CHAINHOOKS_NAME ?? "Fundraising contract logs";
  const replaceExisting = normalizeReplaceExisting(
    env.CHAINHOOKS_REPLACE_EXISTING
  );

  const client = new ChainhooksClient({
    baseUrl,
    apiKey: env.CHAINHOOKS_API_KEY,
    jwt: env.CHAINHOOKS_JWT,
  });

  const definition: any = {
    name,
    version: "1",
    chain: "stacks",
    network,
    start_block: env.CHAINHOOKS_START_BLOCK
      ? parseInt(env.CHAINHOOKS_START_BLOCK, 10)
      : undefined,
    filters: {
      events: [
        {
          type: "contract_log",
          ...(env.EXPECTED_CONTRACT_IDENTIFIER
            ? { contract_identifier: env.EXPECTED_CONTRACT_IDENTIFIER }
            : {}),
        },
      ],
    },
    options: {
      enable_on_registration: true,
      decode_clarity_values: true,
    },
    action: {
      type: "http_post",
      url: webhookUrl,
    },
  };

  // Note: the Hiro Chainhooks API schema does not support custom headers on http_post.
  // If your indexer enforces CHAINHOOK_AUTH_TOKEN, you must disable it (or use the Rust chainhook service).

  const status = await client.getStatus();
  console.log(
    `Chainhooks API: ${status.status} (version: ${status.server_version})`
  );

  if (replaceExisting) {
    const existing = await findExistingByName(client, name, network);
    if (existing) {
      console.log(
        `Deleting existing chainhook with same name: ${existing.uuid}`
      );
      await client.deleteChainhook(existing.uuid);
    }
  }

  const created = await client.registerChainhook(definition);
  console.log(`Registered chainhook: ${created.uuid}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
});
