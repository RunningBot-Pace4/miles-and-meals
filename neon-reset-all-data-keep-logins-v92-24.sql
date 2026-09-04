-- Miles & Meals V92.24 — clear all application data and preserve every login.
--
-- DESTRUCTIVE: create a Neon backup or branch before running this file.
-- Run the COMPLETE file in Neon SQL Editor, not individual statements.
--
-- PRESERVED:
--   "user"             identity, email, name, role and account status
--   "account"          password/OAuth login credentials
--   "session"          active login sessions
--   "verification"     Better Auth verification records
--   "user_preferences" avatar, password flag, locale and time zone
--
-- CLEARED:
--   Every Trip, country, member assignment, budget, expense, receipt,
--   settlement, plan, document, memory, notification, location record,
--   subscription, activity record and product/health log.
--
-- This script preserves ALL registered logins. It does not keep only one admin.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';

-- Freeze authentication/profile writes while the preservation checks run.
-- If the live app is too busy to obtain the lock within 10 seconds, PostgreSQL
-- cancels and rolls back the reset instead of leaving a partial result.
LOCK TABLE
  "user",
  "account",
  "session",
  "verification",
  "user_preferences"
IN SHARE MODE;

CREATE TEMP TABLE _mnm_login_counts (
  users bigint NOT NULL,
  accounts bigint NOT NULL,
  sessions bigint NOT NULL,
  verifications bigint NOT NULL,
  preferences bigint NOT NULL
) ON COMMIT DROP;

INSERT INTO _mnm_login_counts (
  users,
  accounts,
  sessions,
  verifications,
  preferences
)
SELECT
  (SELECT count(*) FROM "user"),
  (SELECT count(*) FROM "account"),
  (SELECT count(*) FROM "session"),
  (SELECT count(*) FROM "verification"),
  (SELECT count(*) FROM "user_preferences");

-- Stop before deletion if there is no usable login data to preserve.
DO $$
DECLARE
  preserved record;
BEGIN
  SELECT * INTO preserved FROM _mnm_login_counts;

  IF preserved.users < 1 OR preserved.accounts < 1 THEN
    RAISE EXCEPTION
      'Reset cancelled: expected at least one user and one login account. Found users=%, accounts=%.',
      preserved.users,
      preserved.accounts;
  END IF;
END;
$$;

-- Tables are explicit by design. If a future schema adds a dependent table,
-- PostgreSQL will fail and roll back instead of silently deleting it via CASCADE.
TRUNCATE TABLE
  location_pings,
  expense_item_assignments,
  expense_items,
  expense_comments,
  expense_payers,
  expense_splits,
  settlements,
  expenses,
  trip_documents,
  trip_emergency_contacts,
  trip_memories,
  trip_inbox_items,
  travel_items,
  trip_invites,
  notifications,
  activity_logs,
  country_members,
  countries,
  trip_budgets,
  trip_category_budgets,
  split_presets,
  trip_member_permissions,
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

-- Verify that authentication and profile rows are byte-for-byte outside the
-- reset scope. A mismatch raises an exception and rolls back the whole reset.
DO $$
DECLARE
  before_counts record;
  after_users bigint;
  after_accounts bigint;
  after_sessions bigint;
  after_verifications bigint;
  after_preferences bigint;
BEGIN
  SELECT * INTO before_counts FROM _mnm_login_counts;

  SELECT count(*) INTO after_users FROM "user";
  SELECT count(*) INTO after_accounts FROM "account";
  SELECT count(*) INTO after_sessions FROM "session";
  SELECT count(*) INTO after_verifications FROM "verification";
  SELECT count(*) INTO after_preferences FROM "user_preferences";

  IF after_users <> before_counts.users
    OR after_accounts <> before_counts.accounts
    OR after_sessions <> before_counts.sessions
    OR after_verifications <> before_counts.verifications
    OR after_preferences <> before_counts.preferences THEN
    RAISE EXCEPTION
      'Reset verification failed. Authentication/profile counts changed; rolling back.';
  END IF;
END;
$$;

-- Neon displays this summary after a successful run.
SELECT
  (SELECT count(*) FROM "user") AS preserved_users,
  (SELECT count(*) FROM "account") AS preserved_login_accounts,
  (SELECT count(*) FROM "session") AS preserved_active_sessions,
  (SELECT count(*) FROM trips) AS remaining_trips,
  (SELECT count(*) FROM expenses) AS remaining_expenses,
  (SELECT count(*) FROM settlements) AS remaining_settlements,
  (SELECT count(*) FROM travel_items) AS remaining_plan_items;

COMMIT;
