import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

if (process.env.RESET_DATABASE !== "YES") {
  throw new Error(
    'Database reset cancelled. Run with RESET_DATABASE="YES" only when you intentionally want to delete ALL Miles & Meals data.',
  );
}

const sql = neon(databaseUrl);

console.warn("[Miles & Meals] Deleting all objects in the public schema...");

await sql`DROP SCHEMA IF EXISTS public CASCADE`;
await sql`CREATE SCHEMA public`;

console.log("[Miles & Meals] Database cleared.");
console.log("Next run:");
console.log("  npm run db:push");
console.log("  npm run seed:admin");
