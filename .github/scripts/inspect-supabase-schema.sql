-- Metadata and counts only: never emit user records, function bodies or secrets.
BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;
SHOW transaction_read_only;

SELECT nspname AS schema_name
FROM pg_catalog.pg_namespace
WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
ORDER BY 1;

SELECT n.nspname AS schema_name, c.relname AS object_name, c.relkind AS kind,
       c.relrowsecurity AS rls_enabled
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
  AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_depend d
    WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e'
  )
ORDER BY 1, 2;

SELECT n.nspname AS schema_name, p.proname AS routine_name,
       pg_catalog.pg_get_function_identity_arguments(p.oid) AS arguments,
       p.prosecdef AS security_definer
FROM pg_catalog.pg_proc p
JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
  AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_depend d
    WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid AND d.deptype = 'e'
  )
ORDER BY 1, 2, 3;

SELECT n.nspname AS schema_name, t.typname AS type_name, t.typtype AS kind
FROM pg_catalog.pg_type t
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema'
  AND t.typtype IN ('e', 'd')
  AND NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_depend d
    WHERE d.classid = 'pg_type'::regclass AND d.objid = t.oid AND d.deptype = 'e'
  )
ORDER BY 1, 2;

SELECT n.nspname AS schema_name, c.relname AS table_name, t.tgname AS trigger_name,
       pn.nspname AS function_schema, p.proname AS function_name
FROM pg_catalog.pg_trigger t
JOIN pg_catalog.pg_class c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_proc p ON p.oid = t.tgfoid
JOIN pg_catalog.pg_namespace pn ON pn.oid = p.pronamespace
WHERE NOT t.tgisinternal AND n.nspname NOT LIKE 'pg_%'
ORDER BY 1, 2, 3;

SELECT schemaname, tablename, policyname, roles, cmd
FROM pg_catalog.pg_policies ORDER BY 1, 2, 3;

-- Count only physical application tables and selected service tables, never views
-- or foreign tables. Identifiers and labels are quoted by PostgreSQL itself.
SELECT format('SELECT %L AS relation, count(*) AS row_count FROM %I.%I;',
              n.nspname || '.' || c.relname, n.nspname, c.relname)
FROM pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p') AND (
  n.nspname = 'public'
  OR (n.nspname = 'auth' AND c.relname = 'users')
  OR (n.nspname = 'storage' AND c.relname IN ('buckets', 'objects'))
  OR (n.nspname = 'supabase_migrations' AND c.relname = 'schema_migrations')
)
ORDER BY n.nspname, c.relname
\gexec

ROLLBACK;
