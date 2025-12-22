import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(4001),
  DATABASE_URL: z.string().min(1),
  CHAINHOOK_AUTH_TOKEN: z.string().min(1).optional(),
  EXPECTED_CONTRACT_IDENTIFIER: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid environment variables: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join(", ")}`
    );
  }
  return parsed.data;
}
