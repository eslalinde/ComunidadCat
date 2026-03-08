-- ==============================================
-- USER COMMUNITY ACCESS (multi-community grants)
-- ==============================================
-- Allows admins and zone_leaders to grant individual
-- users read access to specific communities beyond
-- their profile-level scope.
-- ==============================================

-- 1. Junction table
CREATE TABLE IF NOT EXISTS public.user_community_access (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id bigint NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, community_id)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS idx_uca_user_id ON public.user_community_access(user_id);
CREATE INDEX IF NOT EXISTS idx_uca_community_id ON public.user_community_access(community_id);

-- Enable RLS
ALTER TABLE public.user_community_access ENABLE ROW LEVEL SECURITY;

-- SELECT: admin/contributor see all; zone_leader sees grants for communities in their zone;
-- any authenticated user can see their own grants
CREATE POLICY "uca_select" ON public.user_community_access
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor')
    OR user_id = auth.uid()
    OR (
      public.get_user_role() = 'zone_leader'
      AND public.can_manage_community(community_id)
    )
  );

-- INSERT: admin/contributor global; zone_leader for communities in their zone
CREATE POLICY "uca_insert" ON public.user_community_access
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role() IN ('admin', 'contributor')
    OR (
      public.get_user_role() = 'zone_leader'
      AND public.can_manage_community(community_id)
    )
  );

-- DELETE: same as INSERT
CREATE POLICY "uca_delete" ON public.user_community_access
  FOR DELETE TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor')
    OR (
      public.get_user_role() = 'zone_leader'
      AND public.can_manage_community(community_id)
    )
  );

-- ==============================================
-- 2. UPDATE can_access_community() to also check grants
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
    IF v_community_zone_id = v_user_zone_id THEN
      RETURN true;
    END IF;
  END IF;

  -- Community-scoped roles (including viewer with community): check community match
  IF v_role IN ('community_responsible') OR (v_role = 'viewer' AND v_user_community_id IS NOT NULL) THEN
    IF p_community_id = v_user_community_id THEN
      RETURN true;
    END IF;
  END IF;

  -- Check explicit grants (user_community_access)
  RETURN EXISTS (
    SELECT 1 FROM public.user_community_access
    WHERE user_id = auth.uid()
      AND community_id = p_community_id
  );
END;
$$;

-- ==============================================
-- 3. RPC: grant access
-- ==============================================
CREATE OR REPLACE FUNCTION public.grant_community_access(
  p_user_id uuid,
  p_community_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := public.get_user_role();

  IF v_role = 'admin' OR v_role = 'contributor' THEN
    NULL; -- OK
  ELSIF v_role = 'zone_leader' THEN
    IF NOT public.can_manage_community(p_community_id) THEN
      RAISE EXCEPTION 'No tienes permisos para esta comunidad';
    END IF;
  ELSE
    RAISE EXCEPTION 'Solo admin, contributor y zone_leader pueden otorgar acceso';
  END IF;

  INSERT INTO public.user_community_access (user_id, community_id, granted_by)
  VALUES (p_user_id, p_community_id, auth.uid())
  ON CONFLICT (user_id, community_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_community_access(uuid, bigint) TO authenticated;

-- ==============================================
-- 4. RPC: revoke access
-- ==============================================
CREATE OR REPLACE FUNCTION public.revoke_community_access(
  p_user_id uuid,
  p_community_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := public.get_user_role();

  IF v_role = 'admin' OR v_role = 'contributor' THEN
    NULL; -- OK
  ELSIF v_role = 'zone_leader' THEN
    IF NOT public.can_manage_community(p_community_id) THEN
      RAISE EXCEPTION 'No tienes permisos para esta comunidad';
    END IF;
  ELSE
    RAISE EXCEPTION 'Solo admin, contributor y zone_leader pueden revocar acceso';
  END IF;

  DELETE FROM public.user_community_access
  WHERE user_id = p_user_id
    AND community_id = p_community_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_community_access(uuid, bigint) TO authenticated;

-- ==============================================
-- 5. RPC: list users with access to a community
-- ==============================================
-- Returns users from TWO sources:
--   'profile' = community_id set on profiles (community_responsible / viewer)
--   'grant'   = explicit row in user_community_access
CREATE OR REPLACE FUNCTION public.get_community_access_users(p_community_id bigint)
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  role public.app_role,
  granted_by_name text,
  created_at timestamptz,
  source text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
BEGIN
  v_role := public.get_user_role();

  IF v_role NOT IN ('admin', 'contributor') THEN
    IF v_role = 'zone_leader' THEN
      IF NOT public.can_manage_community(p_community_id) THEN
        RAISE EXCEPTION 'No tienes permisos para ver los accesos de esta comunidad';
      END IF;
    ELSE
      RAISE EXCEPTION 'Permisos insuficientes';
    END IF;
  END IF;

  RETURN QUERY
  -- Users assigned via profile (community_responsible or viewer with community_id)
  SELECT
    p.id AS user_id,
    au.email::text,
    p.full_name,
    p.role,
    NULL::text AS granted_by_name,
    au.created_at,
    'profile'::text AS source
  FROM public.profiles p
  INNER JOIN auth.users au ON au.id = p.id
  WHERE p.community_id = p_community_id

  UNION ALL

  -- Users with explicit grants
  SELECT
    uca.user_id,
    au.email::text,
    up.full_name,
    up.role,
    gp.full_name AS granted_by_name,
    uca.created_at,
    'grant'::text AS source
  FROM public.user_community_access uca
  INNER JOIN auth.users au ON au.id = uca.user_id
  INNER JOIN public.profiles up ON up.id = uca.user_id
  LEFT JOIN public.profiles gp ON gp.id = uca.granted_by
  WHERE uca.community_id = p_community_id
    -- Exclude users already shown via profile to avoid duplicates
    AND NOT EXISTS (
      SELECT 1 FROM public.profiles pp
      WHERE pp.id = uca.user_id AND pp.community_id = p_community_id
    )

  ORDER BY source, created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_community_access_users(bigint) TO authenticated;

-- ==============================================
-- 6. RPC: list communities the current user has explicit access to
-- ==============================================
CREATE OR REPLACE FUNCTION public.get_my_community_access()
RETURNS TABLE (
  community_id bigint,
  community_number text,
  parish_name text,
  granted_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    uca.community_id,
    c.number,
    par.name,
    uca.created_at
  FROM public.user_community_access uca
  INNER JOIN public.communities c ON c.id = uca.community_id
  LEFT JOIN public.parishes par ON par.id = c.parish_id
  WHERE uca.user_id = auth.uid()
  ORDER BY par.name, c.number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_community_access() TO authenticated;
