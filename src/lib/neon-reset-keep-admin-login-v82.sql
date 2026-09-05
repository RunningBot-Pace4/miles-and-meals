-- Miles & Meals v90 Combined — clear Neon and keep one admin login only.
--
-- DESTRUCTIVE: create a Neon backup/branch before running this file.
-- Run the complete file in Neon SQL Editor, not one statement at a time.
--
-- Before running, replace the email on the INSERT statement below:
--   REPLACE_WITH_YOUR_ADMIN_EMAIL@example.com
--
-- Preserved for that admin only:
--   "user"             identity and admin role
--   "account"          password/OAuth credential
--   "session"          current signed-in session, if any
--   "user_preferences" profile and regional settings
--
-- Everything else, including all non-admin users and verification tokens,
-- is removed. If the email is wrong, is not an admin, or has no login
-- credential, the script raises an error before any data is deleted.

BEGIN;

SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';

-- Stop sign-ups/account edits while the keep-list is resolved.
LOCK TABLE "user" IN ACCESS EXCLUSIVE MODE;

CREATE TEMP TABLE _mnm_admin_keep (
  id text PRIMARY KEY,
  email text NOT NULL
) ON COMMIT DROP;

INSERT INTO _mnm_admin_keep (id, email)
SELECT id, email
FROM "user"
WHERE lower(email) = lower('REPLACE_WITH_YOUR_ADMIN_EMAIL@example.com')
  AND lower(coalesce(role, '')) = 'admin';

-- Fail safely before TRUNCATE if the selected admin cannot sign in.
DO $$
DECLARE
  kept_admins integer;
  login_credentials integer;
BEGIN
  SELECT count(*) INTO kept_admins
  FROM _mnm_admin_keep;

  IF kept_admins <> 1 THEN
    RAISE EXCEPTION
      'Reset cancelled: the email must match exactly one user whose role is admin. Found %.',
      kept_admins;
  END IF;

  SELECT count(*) INTO login_credentials
  FROM account a
  INNER JOIN _mnm_admin_keep k ON k.id = a.user_id;

  IF login_credentials < 1 THEN
    RAISE EXCEPTION
      'Reset cancelled: the selected admin has no Better Auth account/login credential.';
  END IF;
END;
$$;

-- Clear every application, Trip, financial, collaboration and telemetry table.
-- All current v90 schema tables are listed explicitly so an unexpected
-- dependency causes a rollback instead of being silently deleted by CASCADE.
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
  login_audits,
  verification
RESTART IDENTITY;

-- Keep authentication/profile records for the selected admin only.
DELETE FROM session s
WHERE NOT EXISTS (
  SELECT 1 FROM _mnm_admin_keep k WHERE k.id = s.user_id
);

DELETE FROM account a
WHERE NOT EXISTS (
  SELECT 1 FROM _mnm_admin_keep k WHERE k.id = a.user_id
);

DELETE FROM user_preferences p
WHERE NOT EXISTS (
  SELECT 1 FROM _mnm_admin_keep k WHERE k.id = p.user_id
);

DELETE FROM "user" u
WHERE NOT EXISTS (
  SELECT 1 FROM _mnm_admin_keep k WHERE k.id = u.id
);

-- An old impersonation marker must not survive after other users are removed.
UPDATE session
SET impersonated_by = NULL
WHERE user_id IN (SELECT id FROM _mnm_admin_keep);

-- Final safety assertion. Any failure rolls the entire transaction back.
DO $$
DECLARE
  remaining_users integer;
  remaining_admin_credentials integer;
BEGIN
  SELECT count(*) INTO remaining_users FROM "user";
  SELECT count(*) INTO remaining_admin_credentials FROM account;

  IF remaining_users <> 1 OR remaining_admin_credentials < 1 THEN
    RAISE EXCEPTION
      'Reset verification failed: users=%, login credentials=%. Rolling back.',
      remaining_users,
      remaining_admin_credentials;
  END IF;
END;
$$;

-- Neon displays this row after a successful run.
SELECT
  u.id AS preserved_admin_id,
  u.email AS preserved_admin_email,
  u.role AS preserved_role,
  (SELECT count(*) FROM account a WHERE a.user_id = u.id) AS login_credentials,
  (SELECT count(*) FROM session s WHERE s.user_id = u.id) AS active_sessions,
  (SELECT count(*) FROM trips) AS remaining_trips,
  (SELECT count(*) FROM expenses) AS remaining_expenses,
  (SELECT count(*) FROM "user") AS remaining_users
FROM "user" u
INNER JOIN _mnm_admin_keep k ON k.id = u.id;

COMMIT;
