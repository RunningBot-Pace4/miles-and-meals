-- Miles & Meals: clear application data, retain ALL users and login credentials.
-- DESTRUCTIVE: create a Neon branch/backup first. Pause app usage/offline sync.
-- Run the entire file in Neon SQL Editor against the intended branch/database.
-- Keeps public.user, public.account and public.user_preferences (account profile
-- and password-change flags). Clears sessions: everyone must sign in again.
-- Does not change passwords, roles or emailVerified values. No CASCADE is used.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';
LOCK TABLE public."user", public.account, public.user_preferences IN SHARE MODE;
CREATE TEMP TABLE _mnm_preserved_counts ON COMMIT DROP AS
SELECT (SELECT count(*) FROM public."user") AS users,
       (SELECT count(*) FROM public.account) AS accounts,
       (SELECT count(*) FROM public.user_preferences) AS profiles;
DO $$
BEGIN
  IF (SELECT users = 0 OR accounts = 0 FROM _mnm_preserved_counts) THEN
    RAISE EXCEPTION 'Reset cancelled: no users/login credentials found to preserve.';
  END IF;
END $$;

TRUNCATE TABLE
  public.location_pings,
  public.expense_item_assignments,
  public.expense_items,
  public.expense_comments,
  public.expense_payers,
  public.expense_splits,
  public.settlement_expense_allocations,
  public.settlements,
  public.expenses,
  public.trip_documents,
  public.trip_emergency_contacts,
  public.trip_memories,
  public.trip_inbox_items,
  public.travel_items,
  public.trip_invites,
  public.notifications,
  public.activity_logs,
  public.country_members,
  public.countries,
  public.trip_budgets,
  public.trip_category_budgets,
  public.split_presets,
  public.trip_member_permissions,
  public.trip_members,
  public.trips,
  public.journeys,
  public.push_subscriptions,
  public.notification_preferences,
  public.api_metrics,
  public.product_events,
  public.app_errors,
  public.login_audits,
  public."session",
  public.verification
RESTART IDENTITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM _mnm_preserved_counts WHERE
    users <> (SELECT count(*) FROM public."user") OR
    accounts <> (SELECT count(*) FROM public.account) OR
    profiles <> (SELECT count(*) FROM public.user_preferences)) THEN
    RAISE EXCEPTION 'Account preservation check failed; reset rolled back.';
  END IF;
END $$;
SELECT (SELECT count(*) FROM public."user") AS preserved_users,
       (SELECT count(*) FROM public.account) AS preserved_login_accounts,
       (SELECT count(*) FROM public.user_preferences) AS preserved_profiles,
       (SELECT count(*) FROM public.trips) AS remaining_trips,
       (SELECT count(*) FROM public.expenses) AS remaining_expenses,
       (SELECT count(*) FROM public.settlements) AS remaining_payments;
COMMIT;
