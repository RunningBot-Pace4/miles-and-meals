-- Miles & Meals: clear application data, keep ALL admin users and login accounts.
-- Run the WHOLE file in Neon SQL Editor on the intended database.
-- DESTRUCTIVE: make a backup/Neon branch first. Trips and non-admin users are deleted.
-- Admin passwords/OAuth accounts are preserved. All sessions are removed: sign in again.
-- Schema/migrations are retained. This does not delete external uploaded files.
-- No email replacement required. Comma-separated admin roles are supported.
BEGIN;
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '2min';
LOCK TABLE public."user", public.account IN ACCESS EXCLUSIVE MODE;
CREATE TEMP TABLE _mnm_keep_admins ON COMMIT DROP AS
SELECT id, email FROM public."user"
WHERE 'admin' = ANY(regexp_split_to_array(lower(trim(coalesce(role, ''))), '\s*,\s*'));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM _mnm_keep_admins) THEN
    RAISE EXCEPTION 'Cleanup cancelled: no admin users found. No data removed.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM _mnm_keep_admins k WHERE NOT EXISTS
      (SELECT 1 FROM public.account a WHERE a.user_id = k.id)
  ) THEN
    RAISE EXCEPTION 'Cleanup cancelled: an admin has no login account. Check admin credentials first.';
  END IF;
END $$;

-- Only known Miles & Meals tables. Optional tables absent on older versions are skipped.
-- Do NOT add CASCADE: an unknown foreign-key dependency should abort the transaction.
DO $$
DECLARE
  table_name text;
  targets text := '';
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'session',
    'login_audits',
    'verification',
    'user_preferences',
    'notification_preferences',
    'push_subscriptions',
    'api_metrics',
    'product_events',
    'app_errors',
    'journeys',
    'trips',
    'trip_members',
    'trip_member_permissions',
    'trip_documents',
    'trip_emergency_contacts',
    'trip_memories',
    'trip_budgets',
    'trip_category_budgets',
    'countries',
    'trip_invites',
    'country_members',
    'notifications',
    'activity_logs',
    'expenses',
    'expense_payers',
    'expense_comments',
    'split_presets',
    'expense_splits',
    'expense_items',
    'expense_item_assignments',
    'settlements',
    'settlement_expense_allocations',
    'travel_items',
    'trip_inbox_items',
    'location_pings',
    'saved_route_distances'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      targets := targets || CASE WHEN targets = '' THEN '' ELSE ', ' END || format('public.%I', table_name);
    END IF;
  END LOOP;
  IF targets <> '' THEN
    EXECUTE 'TRUNCATE TABLE ' || targets || ' RESTART IDENTITY RESTRICT';
  END IF;
END $$;

DELETE FROM public.account a
WHERE NOT EXISTS (SELECT 1 FROM _mnm_keep_admins k WHERE k.id = a.user_id);
DELETE FROM public."user" u
WHERE NOT EXISTS (SELECT 1 FROM _mnm_keep_admins k WHERE k.id = u.id);

DO $$
BEGIN
  IF (SELECT count(*) FROM public."user") <> (SELECT count(*) FROM _mnm_keep_admins)
     OR EXISTS (SELECT 1 FROM _mnm_keep_admins k WHERE NOT EXISTS
       (SELECT 1 FROM public.account a WHERE a.user_id = k.id)) THEN
    RAISE EXCEPTION 'Cleanup verification failed. Transaction will roll back.';
  END IF;
END $$;

SELECT u.id, u.email, u.role,
       (SELECT count(*) FROM public.account a WHERE a.user_id = u.id) AS preserved_login_accounts
FROM public."user" u JOIN _mnm_keep_admins k ON k.id = u.id ORDER BY u.email;
COMMIT;
-- If any statement fails, run ROLLBACK; before retrying. Never continue manually after an error.
