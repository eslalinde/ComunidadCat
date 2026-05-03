-- ==============================================
-- PARISHES: SCOPED SELECT
-- ==============================================
-- Previously parishes_select_authenticated was USING (true), so every authenticated
-- user could read every parish row. Zone-scoped roles must only see parishes within
-- their assigned zone; community-scoped roles must only see the parish that owns
-- the community (or communities) they have access to.
-- ==============================================

CREATE OR REPLACE FUNCTION public.can_access_parish(p_parish_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_user_zone_id bigint;
  v_user_community_id bigint;
  v_parish_zone_id bigint;
  v_user_community_parish_id bigint;
BEGIN
  SELECT role, zone_id, community_id
  INTO v_role, v_user_zone_id, v_user_community_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_role IN ('admin', 'contributor') THEN
    RETURN true;
  END IF;

  SELECT zone_id INTO v_parish_zone_id
  FROM public.parishes
  WHERE id = p_parish_id;

  IF v_role IN ('zone_leader', 'zone_contributor')
     OR (v_role = 'viewer' AND v_user_zone_id IS NOT NULL) THEN
    RETURN v_parish_zone_id IS NOT NULL
      AND v_parish_zone_id = v_user_zone_id;
  END IF;

  IF v_role = 'community_responsible'
     OR (v_role = 'viewer' AND v_user_community_id IS NOT NULL) THEN
    SELECT parish_id INTO v_user_community_parish_id
    FROM public.communities
    WHERE id = v_user_community_id;
    RETURN v_user_community_parish_id = p_parish_id;
  END IF;

  IF v_role = 'viewer' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.user_community_access uca
      JOIN public.communities c ON c.id = uca.community_id
      WHERE uca.user_id = auth.uid()
        AND c.parish_id = p_parish_id
    );
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_parish(bigint) TO authenticated;
COMMENT ON FUNCTION public.can_access_parish(bigint) IS
  'Returns true when the current user is allowed to SELECT the given parish row based on role and scope';

DROP POLICY IF EXISTS "parishes_select_authenticated" ON public.parishes;
DROP POLICY IF EXISTS "parishes_select_scoped" ON public.parishes;

CREATE POLICY "parishes_select_scoped" ON public.parishes
  FOR SELECT
  TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR public.can_access_parish(id)
  );
