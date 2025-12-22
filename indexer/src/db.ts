import pg from "pg";

export type Db = pg.Pool;

export function createDbPool(databaseUrl: string): Db {
  return new pg.Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}
