begin;

-- `service_role` is used only by server-side request handlers and staging
-- fixtures. It bypasses RLS, but it still needs PostgreSQL table privileges
-- on a fresh project where tables are not automatically exposed by the Data
-- API. No client-facing role receives these privileges.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;

alter default privileges in schema public
  grant all privileges on sequences to service_role;

commit;
