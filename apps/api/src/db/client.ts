import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is required. " +
      "Add it to your .env file.\n" +
      "Example: postgresql://user:pass@localhost:5432/nepal_intel"
  );
}

const client = postgres(process.env.DATABASE_URL, {
  max: 10,
  idle_timeout: 30,
  connect_timeout: 10,
  transform: {
    undefined: null,
  },
});

export const db = drizzle(client, { schema });

export async function closeDb(): Promise<void> {
  await client.end();
}
