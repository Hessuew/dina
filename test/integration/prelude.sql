-- Supabase stubs so the production Drizzle migrations parse on PGlite.
-- The migrations ENABLE ROW LEVEL SECURITY and CREATE POLICY ... TO "authenticated"
-- USING (... auth.uid() ...). PGlite has neither the role nor the function, so the
-- policy DDL would fail to parse. We create harmless stubs.
--
-- RLS itself is inert in these tests: PGlite runs queries as the superuser/owner,
-- which bypasses RLS — same effective behaviour as production, which connects as the
-- table owner via Hyperdrive rather than through PostgREST.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT NULL::uuid $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role;
  END IF;
END
$$;
