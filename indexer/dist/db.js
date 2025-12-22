import pg from "pg";
export function createDbPool(databaseUrl) {
    return new pg.Pool({
        connectionString: databaseUrl,
        max: 10,
        idleTimeoutMillis: 30_000,
    });
}
