ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS payment_note text,
  ADD COLUMN IF NOT EXISTS payment_proof_data text;

CREATE INDEX IF NOT EXISTS settlement_payment_method_idx
  ON settlements (payment_method);
