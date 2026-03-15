import { join } from "path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./client.js";

export async function runMigrations(): Promise<void> {
  const migrationsFolder = join(import.meta.dir, "migrations");
  await migrate(db, { migrationsFolder });
  console.log("[migrate] migrations complete");
}
