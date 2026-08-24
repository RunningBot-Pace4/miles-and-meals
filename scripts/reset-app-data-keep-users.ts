import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not configured.");
}

if (process.env.RESET_APP_DATA !== "YES") {
  throw new Error(
    'App-data reset cancelled. Run with RESET_APP_DATA="YES" only after creating a Neon backup/branch.',
  );
}

const sql = neon(databaseUrl);

const before = await sql`
  SELECT
    (SELECT count(*)::int FROM "user") AS users,
    (SELECT count(*)::int FROM "account") AS accounts,
    (SELECT count(*)::int FROM "session") AS sessions,
    (SELECT count(*)::int FROM trips) AS trips,
    (SELECT count(*)::int FROM expenses) AS expenses
`;

console.warn("[Miles & Meals] Resetting app/travel data while preserving login accounts...");
console.log("Before:", before[0]);

await sql`
  TRUNCATE TABLE
    location_pings,
    expense_item_assignments,
    expense_items,
    expense_splits,
    settlements,
    expenses,
    trip_inbox_items,
    travel_items,
    trip_invites,
    notifications,
    activity_logs,
    country_members,
    countries,
    trip_budgets,
    trip_members,
    trips,
    journeys,
    push_subscriptions,
    notification_preferences,
    api_metrics,
    product_events,
    app_errors,
    login_audits
  RESTART IDENTITY
`;

const after = await sql`
  SELECT
    (SELECT count(*)::int FROM "user") AS users,
    (SELECT count(*)::int FROM "account") AS accounts,
    (SELECT count(*)::int FROM "session") AS sessions,
    (SELECT count(*)::int FROM trips) AS trips,
    (SELECT count(*)::int FROM expenses) AS expenses
`;

console.log("After:", after[0]);
console.log("[Miles & Meals] App data reset complete. Login users/accounts were preserved.");
