-- Miles & Meals — reset application/travel data while keeping login accounts.
-- v77
-- Create a Neon backup/branch before running this destructive script.
-- PRESERVED:
--   "user"             -> user identity and role
--   "account"          -> login/password provider credentials
--   "session"          -> current login sessions
--   "verification"     -> Better Auth verification records
--   "user_preferences" -> avatar, security flag, locale and time zone

BEGIN;

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
RESTART IDENTITY;

COMMIT;
