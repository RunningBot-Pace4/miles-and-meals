-- Miles & Meals v85 Combined (v83 + v84 + v85)
-- Non-destructive Neon upgrade. Back up/branch Neon before running.

BEGIN;

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS receipt_review_status text NOT NULL DEFAULT 'NOT_REQUIRED',
  ADD COLUMN IF NOT EXISTS receipt_confidence integer,
  ADD COLUMN IF NOT EXISTS receipt_reviewed_at timestamptz;

ALTER TABLE travel_items
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

CREATE TABLE IF NOT EXISTS trip_category_budgets (
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  category text NOT NULL,
  amount numeric(18,2) NOT NULL,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, category)
);

CREATE INDEX IF NOT EXISTS trip_category_budget_trip_idx
  ON trip_category_budgets(trip_id);

CREATE TABLE IF NOT EXISTS expense_payers (
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  amount_base numeric(18,2) NOT NULL,
  PRIMARY KEY (expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS expense_payer_user_idx
  ON expense_payers(user_id);

CREATE TABLE IF NOT EXISTS expense_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id uuid NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS expense_comment_expense_time_idx
  ON expense_comments(expense_id, created_at);

CREATE TABLE IF NOT EXISTS split_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  name text NOT NULL,
  split_mode text NOT NULL DEFAULT 'SHARES',
  shares_json text NOT NULL,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS split_preset_trip_idx
  ON split_presets(trip_id);

CREATE UNIQUE INDEX IF NOT EXISTS split_preset_trip_name_uq
  ON split_presets(trip_id, name);

-- Existing one-payer expenses become explicit payer-contribution rows.
INSERT INTO expense_payers (expense_id, user_id, amount_base)
SELECT
  id,
  paid_by_user_id,
  coalesce(nullif(actual_converted_amount, 0), converted_amount)
FROM expenses
ON CONFLICT (expense_id, user_id) DO NOTHING;

-- Give existing same-day planner items a stable order without changing dates/times.
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY country_id, item_type, item_date
      ORDER BY item_time NULLS LAST, created_at, id
    ) AS position
  FROM travel_items
)
UPDATE travel_items AS item
SET sort_order = ranked.position
FROM ranked
WHERE item.id = ranked.id
  AND item.sort_order = 0;

COMMIT;
