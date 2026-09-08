ALTER TABLE settlements
  ADD COLUMN IF NOT EXISTS reversed_by text,
  ADD COLUMN IF NOT EXISTS reversed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reversal_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'settlements_reversed_by_user_id_fk'
  ) THEN
    ALTER TABLE settlements
      ADD CONSTRAINT settlements_reversed_by_user_id_fk
      FOREIGN KEY (reversed_by)
      REFERENCES "user"(id)
      ON DELETE SET NULL;
  END IF;
END
$$;
