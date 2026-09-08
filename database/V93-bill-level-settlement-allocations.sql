-- Miles & Meals · bill-level settlement allocations
-- Preferred deployment path: npm run db:push
-- This SQL is provided for environments that apply schema changes manually.

CREATE TABLE IF NOT EXISTS settlement_expense_allocations (
  settlement_id uuid NOT NULL
    REFERENCES settlements(id) ON DELETE CASCADE,
  expense_id uuid NOT NULL
    REFERENCES expenses(id) ON DELETE RESTRICT,
  amount_base numeric(18, 2) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (settlement_id, expense_id)
);

CREATE INDEX IF NOT EXISTS settlement_allocation_expense_idx
  ON settlement_expense_allocations (expense_id);
