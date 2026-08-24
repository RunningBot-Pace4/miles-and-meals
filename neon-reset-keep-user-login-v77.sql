-- Miles & Meals v77 — reset application/travel data while keeping login accounts.
-- Create a Neon backup/branch before running this destructive script.
-- PRESERVED: user, account, session, verification, user_preferences.

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
