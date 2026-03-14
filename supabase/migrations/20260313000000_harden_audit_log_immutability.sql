-- ============================================================
-- Harden audit_log: explicit immutability protection
-- ============================================================
-- The audit_log table relies on "no policy = denied by default" for
-- UPDATE/DELETE. This migration adds an explicit database-level trigger
-- to reject any UPDATE or DELETE attempts, regardless of RLS or role.
-- This is defense-in-depth: even if a future migration accidentally
-- adds a permissive policy, the trigger will still block tampering.

-- 1. Create a trigger function that blocks UPDATE and DELETE
CREATE OR REPLACE FUNCTION public.audit_log_prevent_tampering()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is immutable: % operations are not allowed', TG_OP;
  RETURN NULL;
END;
$$;

-- 2. Attach trigger to block DELETE
CREATE TRIGGER audit_log_no_delete
  BEFORE DELETE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_prevent_tampering();

-- 3. Attach trigger to block UPDATE
CREATE TRIGGER audit_log_no_update
  BEFORE UPDATE ON public.audit_log
  FOR EACH ROW EXECUTE FUNCTION public.audit_log_prevent_tampering();
