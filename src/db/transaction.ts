import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { schema } from "@/db/schema";

export function createTransactionalDatabase(
  connectionString = process.env.DATABASE_URL,
) {
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const pool = new Pool({ connectionString });
  const database = drizzle({
    client: pool,
    schema,
  });

  return {
    database,
    async close() {
      await pool.end();
    },
  };
}
