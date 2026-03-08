-- ==============================================
-- VIEWER: SCOPED ACCESS
-- ==============================================
-- Viewer is no longer a global read-all role.
-- A viewer must have zone_id or community_id assigned to see content.
-- A new user (viewer with no scope) sees nothing until an admin assigns scope.
-- ==============================================

-- ==============================================
-- 1. UPDATE can_access_community() — viewer is now scoped
-- ==============================================
CREATE OR REPLACE FUNCTION public.can_access_community(p_community_id bigint)
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
  v_community_zone_id bigint;
BEGIN
  SELECT role, zone_id, community_id
  INTO v_role, v_user_zone_id, v_user_community_id
  FROM public.profiles WHERE id = auth.uid();

  -- Admin and contributor have global access
  IF v_role IN ('admin', 'contributor') THEN
    RETURN true;
  END IF;

  -- Zone-scoped roles (including viewer with zone): check zone match
  IF v_role IN ('zone_leader', 'zone_contributor') OR (v_role = 'viewer' AND v_user_zone_id IS NOT NULL) THEN
    v_community_zone_id := public.get_community_zone_id(p_community_id);
    RETURN v_community_zone_id = v_user_zone_id;
  END IF;

  -- Community-scoped roles (including viewer with community): check community match
  IF v_role IN ('community_responsible') OR (v_role = 'viewer' AND v_user_community_id IS NOT NULL) THEN
    RETURN p_community_id = v_user_community_id;
  END IF;

  -- Viewer without scope or unknown role: no access
  RETURN false;
END;
$$;

-- ==============================================
-- 2. UPDATE SELECT POLICIES — remove viewer from global list
-- ==============================================
-- All these policies had: get_user_role() IN ('admin', 'contributor', 'viewer')
-- Now viewer goes through can_access_community() like zone/community roles.

-- COMMUNITIES
DROP POLICY IF EXISTS "communities_select_authenticated" ON public.communities;
CREATE POLICY "communities_select_scoped" ON public.communities
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor')
    OR public.can_access_community(id)
  );

-- BROTHERS
DROP POLICY IF EXISTS "brothers_select_scoped" ON public.brothers;
CREATE POLICY "brothers_select_scoped" ON public.brothers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor')
    OR public.can_access_community(community_id)
  );

-- TEAMS
DROP POLICY IF EXISTS "teams_select_scoped" ON public.teams;
CREATE POLICY "teams_select_scoped" ON public.teams
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor')
    OR community_id IS NULL  -- national teams visible to all authenticated
    OR public.can_access_community(community_id)
  );

-- BELONGS
DROP POLICY IF EXISTS "belongs_select_scoped" ON public.belongs;
CREATE POLICY "belongs_select_scoped" ON public.belongs
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor')
    OR community_id IS NULL
    OR public.can_access_community(community_id)
  );

-- COMMUNITY_STEP_LOG
DROP POLICY IF EXISTS "community_step_log_select_scoped" ON public.community_step_log;
CREATE POLICY "community_step_log_select_scoped" ON public.community_step_log
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor')
    OR public.can_access_community(community_id)
  );
