-- ==============================================
-- CUSTOM ROLES & SCOPE COLUMNS
-- ==============================================
-- Evolve app_role enum to support zone/community scoped roles.
-- Add scope columns (person_id, zone_id, community_id) to profiles.
-- Create authorization helper functions.
-- ==============================================

-- NOTE: The new enum values (zone_leader, zone_contributor, community_responsible)
-- are added in the preceding migration 20260305000000_add_role_enum_values.sql
-- because PostgreSQL requires ALTER TYPE ADD VALUE to commit before the new
-- values can be referenced.

-- ==============================================
-- 1. ADD SCOPE COLUMNS TO PROFILES
-- ==============================================
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS person_id bigint REFERENCES public.people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS zone_id bigint REFERENCES public.city_zones(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS community_id bigint REFERENCES public.communities(id) ON DELETE SET NULL;

-- Indexes for scope lookups
CREATE INDEX IF NOT EXISTS profiles_person_id_idx ON public.profiles(person_id);
CREATE INDEX IF NOT EXISTS profiles_zone_id_idx ON public.profiles(zone_id);
CREATE INDEX IF NOT EXISTS profiles_community_id_idx ON public.profiles(community_id);

-- ==============================================
-- 3. CONSISTENCY CONSTRAINTS
-- ==============================================
-- community_responsible MUST have a community_id
-- zone_leader / zone_contributor MUST have a zone_id
-- admin / contributor / viewer should NOT have community_id or zone_id set
-- (enforced via check constraint)
ALTER TABLE public.profiles
  ADD CONSTRAINT chk_role_scope CHECK (
    CASE role
      WHEN 'community_responsible' THEN community_id IS NOT NULL
      WHEN 'zone_leader' THEN zone_id IS NOT NULL
      WHEN 'zone_contributor' THEN zone_id IS NOT NULL
      ELSE true  -- admin, contributor, viewer don't require scope
    END
  );

-- ==============================================
-- 4. AUTHORIZATION HELPER FUNCTIONS
-- ==============================================

-- Get current user's zone_id
CREATE OR REPLACE FUNCTION public.get_user_zone_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT zone_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Get current user's community_id
CREATE OR REPLACE FUNCTION public.get_user_community_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT community_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Get the zone_id for a given community (via parish)
CREATE OR REPLACE FUNCTION public.get_community_zone_id(p_community_id bigint)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.zone_id
  FROM public.communities c
  JOIN public.parishes p ON c.parish_id = p.id
  WHERE c.id = p_community_id;
$$;

-- Can the current user ACCESS (read) a specific community?
-- Admin, contributor, viewer: can access all communities (existing behavior)
-- zone_leader, zone_contributor: can access communities in their zone
-- community_responsible: can only access their assigned community
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

  -- Global roles can access everything
  IF v_role IN ('admin', 'contributor', 'viewer') THEN
    RETURN true;
  END IF;

  -- Zone-scoped roles: check if community is in their zone
  IF v_role IN ('zone_leader', 'zone_contributor') THEN
    v_community_zone_id := public.get_community_zone_id(p_community_id);
    RETURN v_community_zone_id = v_user_zone_id;
  END IF;

  -- Community responsible: only their community
  IF v_role = 'community_responsible' THEN
    RETURN p_community_id = v_user_community_id;
  END IF;

  RETURN false;
END;
$$;

-- Can the current user MANAGE (edit/delete) a specific community?
-- Admin: can manage all
-- contributor: can manage all (edit, not delete — handled by separate policy)
-- zone_leader: can manage communities in their zone
-- zone_contributor: can manage communities in their zone (edit only)
-- community_responsible: CANNOT manage community info
CREATE OR REPLACE FUNCTION public.can_manage_community(p_community_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_user_zone_id bigint;
  v_community_zone_id bigint;
BEGIN
  SELECT role, zone_id
  INTO v_role, v_user_zone_id
  FROM public.profiles WHERE id = auth.uid();

  IF v_role IN ('admin', 'contributor') THEN
    RETURN true;
  END IF;

  IF v_role IN ('zone_leader', 'zone_contributor') THEN
    v_community_zone_id := public.get_community_zone_id(p_community_id);
    RETURN v_community_zone_id = v_user_zone_id;
  END IF;

  -- community_responsible cannot edit community info
  RETURN false;
END;
$$;

-- Can the current user manage a specific zone?
-- Admin: all zones
-- zone_leader: their own zone
CREATE OR REPLACE FUNCTION public.can_manage_zone(p_zone_id bigint)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_user_zone_id bigint;
BEGIN
  SELECT role, zone_id
  INTO v_role, v_user_zone_id
  FROM public.profiles WHERE id = auth.uid();

  IF v_role = 'admin' THEN
    RETURN true;
  END IF;

  IF v_role = 'zone_leader' THEN
    RETURN p_zone_id = v_user_zone_id;
  END IF;

  RETURN false;
END;
$$;

-- Can the current user manage brothers in a community?
-- (add/remove people as brothers)
-- Admin, contributor: yes for all
-- zone_leader, zone_contributor: yes for their zone
-- community_responsible: yes for their community only
CREATE OR REPLACE FUNCTION public.can_manage_brothers(p_community_id bigint)
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

  IF v_role IN ('admin', 'contributor') THEN
    RETURN true;
  END IF;

  IF v_role IN ('zone_leader', 'zone_contributor') THEN
    v_community_zone_id := public.get_community_zone_id(p_community_id);
    RETURN v_community_zone_id = v_user_zone_id;
  END IF;

  IF v_role = 'community_responsible' THEN
    RETURN p_community_id = v_user_community_id;
  END IF;

  RETURN false;
END;
$$;

-- ==============================================
-- 5. UPDATE is_contributor_or_admin TO INCLUDE ZONE ROLES
-- ==============================================
-- Zone leaders and zone contributors should also pass the old
-- "contributor or admin" checks for tables they have access to.
-- However, the old function was used globally. We keep it as-is
-- and rely on the new scoped functions for the new roles.
-- The old function remains correct: only admin/contributor are global writers.

-- ==============================================
-- 6. GRANT EXECUTE ON NEW FUNCTIONS
-- ==============================================
GRANT EXECUTE ON FUNCTION public.get_user_zone_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_community_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_community_zone_id(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_community(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_community(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_zone(bigint) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_brothers(bigint) TO authenticated;

-- ==============================================
-- 7. UPDATE get_user_role TO RETURN PROFILE WITH SCOPE
-- ==============================================
-- Create a new function that returns the full user scope info
CREATE OR REPLACE FUNCTION public.get_user_scope()
RETURNS TABLE (
  role public.app_role,
  person_id bigint,
  zone_id bigint,
  community_id bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role, person_id, zone_id, community_id
  FROM public.profiles
  WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_scope() TO authenticated;

-- ==============================================
-- 8. COMMENTS
-- ==============================================
COMMENT ON FUNCTION public.get_user_zone_id() IS 'Returns the zone_id assigned to the current user (null for global roles)';
COMMENT ON FUNCTION public.get_user_community_id() IS 'Returns the community_id assigned to the current user (null unless community_responsible)';
COMMENT ON FUNCTION public.get_community_zone_id(bigint) IS 'Returns the zone_id of a community via its parish';
COMMENT ON FUNCTION public.can_access_community(bigint) IS 'Checks if the current user can view a specific community based on role/scope';
COMMENT ON FUNCTION public.can_manage_community(bigint) IS 'Checks if the current user can edit a specific community based on role/scope';
COMMENT ON FUNCTION public.can_manage_zone(bigint) IS 'Checks if the current user can manage entities in a specific zone';
COMMENT ON FUNCTION public.can_manage_brothers(bigint) IS 'Checks if the current user can add/remove brothers in a community';
COMMENT ON FUNCTION public.get_user_scope() IS 'Returns role, person_id, zone_id, community_id for the current user';
