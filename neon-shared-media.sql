-- Run once in Neon SQL Editor before enabling shared uploads. Does not remove data.
BEGIN;
CREATE TABLE IF NOT EXISTS shared_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id text NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
  pathname text NOT NULL,
  name text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 26214400),
  status text NOT NULL DEFAULT 'UPLOADING' CHECK (status IN ('UPLOADING','READY','REVOKED')),
  consent_version text NOT NULL,
  consent_text text NOT NULL,
  consented_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS shared_media_path_uq ON shared_media(pathname);
CREATE INDEX IF NOT EXISTS shared_media_owner_idx ON shared_media(owner_id, created_at);
COMMIT;
