-- Miles & Meals v90 Combined (v86 + v87 + v88 + v89 + v90)
-- Non-destructive Neon upgrade. Create a Neon branch or backup before running.

BEGIN;

CREATE TABLE IF NOT EXISTS trip_member_permissions (
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  can_edit_plan boolean NOT NULL DEFAULT true,
  can_add_expenses boolean NOT NULL DEFAULT true,
  can_view_documents boolean NOT NULL DEFAULT true,
  can_add_memories boolean NOT NULL DEFAULT true,
  updated_by text NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (trip_id, user_id)
);

CREATE INDEX IF NOT EXISTS trip_member_permission_user_idx
  ON trip_member_permissions(user_id);

CREATE TABLE IF NOT EXISTS trip_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  document_type text NOT NULL DEFAULT 'OTHER',
  document_data text,
  external_url text,
  expiry_date date,
  visibility text NOT NULL DEFAULT 'TRIP',
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_documents_source_check CHECK (document_data IS NOT NULL OR external_url IS NOT NULL),
  CONSTRAINT trip_documents_visibility_check CHECK (visibility IN ('TRIP', 'PRIVATE'))
);

CREATE INDEX IF NOT EXISTS trip_document_trip_time_idx
  ON trip_documents(trip_id, created_at);
CREATE INDEX IF NOT EXISTS trip_document_creator_idx
  ON trip_documents(created_by);

CREATE TABLE IF NOT EXISTS trip_emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label text NOT NULL,
  contact_name text NOT NULL,
  phone text NOT NULL,
  notes text,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_emergency_contact_trip_idx
  ON trip_emergency_contacts(trip_id);

CREATE TABLE IF NOT EXISTS trip_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title text NOT NULL,
  story text,
  place text,
  occurred_on date,
  photo_data text,
  created_by text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trip_memory_trip_date_idx
  ON trip_memories(trip_id, occurred_on);

COMMIT;
