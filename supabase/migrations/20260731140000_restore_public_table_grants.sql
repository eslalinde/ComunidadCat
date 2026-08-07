-- Restore the base PostgreSQL privileges required before RLS policies can run.
-- RLS remains responsible for deciding which rows each authenticated user can
-- read or modify.

GRANT SELECT, INSERT, UPDATE, DELETE
ON ALL TABLES IN SCHEMA public
TO authenticated;

GRANT USAGE, SELECT
ON ALL SEQUENCES IN SCHEMA public
TO authenticated;

-- The service role bypasses RLS, but still needs PostgreSQL object privileges.
GRANT ALL PRIVILEGES
ON ALL TABLES IN SCHEMA public
TO service_role;

GRANT ALL PRIVILEGES
ON ALL SEQUENCES IN SCHEMA public
TO service_role;

-- Migrations are executed as postgres locally, so configure future objects
-- created by that role with the same privileges.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
