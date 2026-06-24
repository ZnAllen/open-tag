// Drizzle + postgres.js client
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema.js";

const url = process.env.DATABASE_URL ?? "postgres://fancy:fancy@localhost:5433/fancyloop";
export const sql = postgres(url);
export const db = drizzle(sql, { schema });
export { schema };
