import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  var __concertboxdSql: ReturnType<typeof postgres> | undefined;
}

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to your .env file (see .env.example)."
  );
}

// Reuse the connection across hot-reloads in dev so we don't exhaust
// the Postgres connection limit.
const sql =
  global.__concertboxdSql ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  });

if (process.env.NODE_ENV !== "production") {
  global.__concertboxdSql = sql;
}

export const db = drizzle(sql, { schema });
export { schema };
