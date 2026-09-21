-- Run once in Neon SQL Editor before deploying this release.
-- Adds shared route results only. Does not delete existing app data.
BEGIN;
CREATE TABLE IF NOT EXISTS public.saved_route_distances (
  country_id uuid NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  stay_id uuid NOT NULL REFERENCES public.travel_items(id) ON DELETE CASCADE,
  place_id uuid NOT NULL REFERENCES public.travel_items(id) ON DELETE CASCADE,
  mode text NOT NULL CHECK (mode IN ('walk', 'drive')),
  pin_key text NOT NULL,
  km double precision NOT NULL CHECK (km >= 0),
  minutes integer NOT NULL CHECK (minutes >= 0),
  checked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (country_id, stay_id, place_id, mode)
);
COMMIT;
