-- ─────────────────────────────────────────────────────────────────────────────
-- Grant the API roles access to the tables.
--
-- Symptom without this: every PostgREST request returns 42501
-- "permission denied for table …", even with the secret/service key.
-- It happens when tables are created without Supabase's default privileges
-- reaching the API roles.
--
-- Only service_role is granted: the app talks to Postgres exclusively through
-- server-side route handlers using the secret key. The anon/publishable key is
-- deliberately left with no access at all (belt and braces alongside RLS).
-- ─────────────────────────────────────────────────────────────────────────────

grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

-- Tables added later inherit the same access.
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public grant all on sequences to service_role;

-- Verify (should list customers, addresses, orders, otp_codes, vendors):
--   select table_name, privilege_type from information_schema.role_table_grants
--   where grantee = 'service_role' and table_schema = 'public' order by table_name;
