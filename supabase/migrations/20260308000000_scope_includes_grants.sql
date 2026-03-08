-- ==============================================
-- UPDATE get_user_scope() to include community grant info
-- ==============================================
-- Viewers granted access via user_community_access but without
-- profile-level scope (zone_id/community_id) were invisible to
-- the frontend sidebar check. Adding has_community_grants lets
-- the UI know the user has explicit grants.
-- ==============================================

DROP FUNCTION IF EXISTS public.get_user_scope();

CREATE OR REPLACE FUNCTION public.get_user_scope()
RETURNS TABLE (
  role public.app_role,
  person_id bigint,
  zone_id bigint,
  community_id bigint,
  has_community_grants boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.role,
    p.person_id,
    p.zone_id,
    p.community_id,
    EXISTS (
      SELECT 1 FROM public.user_community_access uca
      WHERE uca.user_id = auth.uid()
    ) AS has_community_grants
  FROM public.profiles p
  WHERE p.id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_scope() TO authenticated;
