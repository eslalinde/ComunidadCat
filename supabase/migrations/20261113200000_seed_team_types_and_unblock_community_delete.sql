-- ============================================================
-- 1. Reference team types
-- ============================================================
-- The app creates teams with fixed team_type_id values (3 = Catequistas,
-- 4 = Responsables), but these rows were only inserted by seed.sql, so any
-- database built from migrations alone (integration) had no team types and
-- every team insert failed with a foreign key error (23503).
-- Rows that already exist (by id or by unique name) are left untouched.
INSERT INTO public.team_types (id, name, order_num) VALUES
  (1, 'Catequistas de la Nación', 1),
  (2, 'Itinerantes', 2),
  (3, 'Catequistas', 3),
  (4, 'Responsables', 4)
ON CONFLICT DO NOTHING;

-- Keep the identity sequence ahead of the explicit ids.
SELECT setval(
  pg_get_serial_sequence('public.team_types', 'id'),
  GREATEST((SELECT max(id) FROM public.team_types), 1),
  true
);

-- ============================================================
-- 2. Allow deleting communities that have audit history
-- ============================================================
-- audit_log.community_id referenced communities ON DELETE SET NULL, but
-- audit_log rejects every UPDATE (20260313000000_harden_audit_log_immutability),
-- so deleting any community with history failed with
-- "audit_log is immutable: UPDATE operations are not allowed".
-- The AFTER DELETE audit trigger also records the deleted community's id,
-- which the foreign key would reject. An audit trail must keep the original
-- id after the community is gone, so the column becomes a plain reference.
ALTER TABLE public.audit_log
  DROP CONSTRAINT IF EXISTS audit_log_community_id_fkey;
