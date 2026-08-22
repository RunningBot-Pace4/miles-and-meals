-- Miles & Meals — reset application/travel data while keeping login accounts.
-- v69
--
-- PRESERVED:
--   "user"            -> user identity, role, banned status
--   "account"         -> password / auth provider credentials
--   "session"         -> current login sessions
--   "verification"    -> Better Auth verification records
--   "user_preferences"-> avatar + must-change-password security state
--
-- CLEARED:
--   trips, memberships, budgets, destinations, expenses/splits, settlements,
--   planner items, GPS pings, notifications, activity, push subscriptions,
--   notification preferences, login audit history, metrics, analytics, app errors.
--
-- Make a Neon backup/branch BEFORE running this file. This action is destructive.

BEGIN;

TRUNCATE TABLE
  location_pings,
  expense_splits,
  settlements,
  expenses,
  travel_items,
  notifications,
  activity_logs,
  country_members,
  countries,
  trip_budgets,
  trip_members,
  trips,
  push_subscriptions,
  notification_preferences,
  api_metrics,
  product_events,
  app_errors,
  login_audits
RESTART IDENTITY;

COMMIT;
