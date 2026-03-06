-- ==============================================
-- UPDATE RPC FUNCTIONS FOR CUSTOM ROLES
-- ==============================================

-- ==============================================
-- 1. UPDATE set_user_role TO HANDLE SCOPE FIELDS
-- ==============================================
-- Drop old 2-arg signature so the new 5-arg version replaces it cleanly.
DROP FUNCTION IF EXISTS public.set_user_role(uuid, public.app_role);
CREATE OR REPLACE FUNCTION public.set_user_role(
  target_user_id uuid,
  new_role public.app_role,
  new_person_id bigint DEFAULT NULL,
  new_zone_id bigint DEFAULT NULL,
  new_community_id bigint DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can change user roles';
  END IF;

  -- Validate scope consistency
  IF new_role = 'community_responsible' AND new_community_id IS NULL THEN
    RAISE EXCEPTION 'community_responsible role requires a community_id';
  END IF;
  IF new_role IN ('zone_leader', 'zone_contributor') AND new_zone_id IS NULL THEN
    RAISE EXCEPTION '% role requires a zone_id', new_role;
  END IF;

  -- Clear scope fields that don't apply to the new role
  IF new_role IN ('admin', 'contributor') THEN
    new_zone_id := NULL;
    new_community_id := NULL;
  END IF;
  -- Viewer accepts optional zone OR community (not both)
  IF new_role = 'viewer' AND new_zone_id IS NOT NULL THEN
    new_community_id := NULL;
  END IF;
  IF new_role = 'community_responsible' THEN
    new_zone_id := NULL;
  END IF;
  IF new_role IN ('zone_leader', 'zone_contributor') THEN
    new_community_id := NULL;
  END IF;

  -- Update the profile
  UPDATE public.profiles
  SET
    role = new_role,
    person_id = new_person_id,
    zone_id = new_zone_id,
    community_id = new_community_id,
    updated_at = NOW()
  WHERE id = target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;
END;
$$;

-- Drop old signature grant and re-grant with new signature
GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, public.app_role, bigint, bigint, bigint) TO authenticated;

-- ==============================================
-- 2. UPDATE get_admin_users_list TO INCLUDE SCOPE
-- ==============================================
-- Must DROP first because the return type changes (new columns added).
DROP FUNCTION IF EXISTS public.get_admin_users_list();
CREATE OR REPLACE FUNCTION public.get_admin_users_list()
RETURNS TABLE (
  id uuid,
  email text,
  full_name text,
  username text,
  avatar_url text,
  role public.app_role,
  person_id bigint,
  zone_id bigint,
  community_id bigint,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if current user is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only administrators can view the users list';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    au.email::text,
    p.full_name,
    p.username,
    p.avatar_url,
    p.role,
    p.person_id,
    p.zone_id,
    p.community_id,
    au.created_at,
    au.last_sign_in_at
  FROM public.profiles p
  INNER JOIN auth.users au ON au.id = p.id
  ORDER BY au.created_at DESC;
END;
$$;

-- ==============================================
-- 3. UPDATE merge_communities TO CHECK ZONE SCOPE
-- ==============================================
CREATE OR REPLACE FUNCTION merge_communities(
  p_keep_community_id BIGINT,
  p_remove_community_id BIGINT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role public.app_role;
  v_keep_community RECORD;
  v_remove_community RECORD;
  v_step_log_summary TEXT;
  v_brothers_moved INT := 0;
  v_members_moved INT := 0;
  v_keep_team_id BIGINT;
  v_remove_team RECORD;
BEGIN
  -- Role check: must be able to manage both communities
  v_role := public.get_user_role();

  IF v_role = 'admin' OR v_role = 'contributor' THEN
    -- OK: global access
    NULL;
  ELSIF v_role = 'zone_leader' THEN
    -- Must be able to manage both communities
    IF NOT public.can_manage_community(p_keep_community_id) OR
       NOT public.can_manage_community(p_remove_community_id) THEN
      RAISE EXCEPTION 'Permiso denegado: no tienes acceso a ambas comunidades';
    END IF;
  ELSE
    RAISE EXCEPTION 'Permiso denegado: solo admin, contributor y zone_leader pueden fusionar comunidades';
  END IF;

  -- 1. Validaciones
  SELECT * INTO v_keep_community FROM communities WHERE id = p_keep_community_id;
  SELECT * INTO v_remove_community FROM communities WHERE id = p_remove_community_id;

  IF v_keep_community IS NULL THEN
    RAISE EXCEPTION 'Comunidad principal (id=%) no existe', p_keep_community_id;
  END IF;
  IF v_remove_community IS NULL THEN
    RAISE EXCEPTION 'Comunidad a eliminar (id=%) no existe', p_remove_community_id;
  END IF;
  IF p_keep_community_id = p_remove_community_id THEN
    RAISE EXCEPTION 'No se puede fusionar una comunidad consigo misma';
  END IF;

  -- 2. Construir resumen de bitacora
  SELECT STRING_AGG(
    FORMAT('[%s] %s - %s: %s',
      COALESCE(csl.date_of_step::TEXT, 'Sin fecha'),
      COALESCE(sw.name, 'Sin etapa'),
      CASE WHEN csl.outcome THEN 'Aprobado' ELSE 'No aprobado' END,
      COALESCE(csl.notes, '')
    ), E'\n' ORDER BY csl.date_of_step
  ) INTO v_step_log_summary
  FROM community_step_log csl
  LEFT JOIN step_ways sw ON csl.step_way_id = sw.id
  WHERE csl.community_id = p_remove_community_id;

  -- 3. Crear entrada en step_log
  INSERT INTO community_step_log (community_id, date_of_step, notes)
  VALUES (
    p_keep_community_id,
    CURRENT_DATE,
    FORMAT('FUSION: Se absorbio la Comunidad %s. Hermanos actuales: %s. ' ||
           E'\n--- Bitacora de la comunidad fusionada ---\n%s',
      v_remove_community.number,
      COALESCE(v_remove_community.actual_brothers, 0),
      COALESCE(v_step_log_summary, 'Sin registros')
    )
  );

  -- 4. Mover hermanos
  WITH moved AS (
    UPDATE brothers
    SET community_id = p_keep_community_id
    WHERE community_id = p_remove_community_id
      AND person_id NOT IN (
        SELECT person_id FROM brothers WHERE community_id = p_keep_community_id
      )
    RETURNING id
  )
  SELECT COUNT(*) INTO v_brothers_moved FROM moved;

  DELETE FROM brothers WHERE community_id = p_remove_community_id;

  -- 5. Mover miembros de equipos
  FOR v_remove_team IN
    SELECT * FROM teams WHERE community_id = p_remove_community_id
  LOOP
    SELECT id INTO v_keep_team_id
    FROM teams
    WHERE community_id = p_keep_community_id
      AND team_type_id = v_remove_team.team_type_id
    LIMIT 1;

    IF v_keep_team_id IS NOT NULL THEN
      WITH moved AS (
        UPDATE belongs
        SET team_id = v_keep_team_id,
            community_id = p_keep_community_id,
            is_responsible_for_the_team = false
        WHERE team_id = v_remove_team.id
          AND person_id NOT IN (
            SELECT person_id FROM belongs WHERE team_id = v_keep_team_id
          )
        RETURNING id
      )
      SELECT v_members_moved + COUNT(*) INTO v_members_moved FROM moved;
    END IF;

    DELETE FROM belongs WHERE team_id = v_remove_team.id;
    DELETE FROM parish_teams WHERE team_id = v_remove_team.id;
  END LOOP;

  -- 6. Eliminar step_logs
  DELETE FROM community_step_log WHERE community_id = p_remove_community_id;

  -- 7. Limpiar referencia cathechist_team_id
  UPDATE communities
  SET cathechist_team_id = NULL
  WHERE id = p_remove_community_id AND cathechist_team_id IS NOT NULL;

  -- 8. Eliminar equipos
  DELETE FROM teams WHERE community_id = p_remove_community_id;

  -- 9. Eliminar la comunidad
  DELETE FROM communities WHERE id = p_remove_community_id;

  -- 10. Recalcular numeros ordinales
  IF v_remove_community.parish_id IS NOT NULL THEN
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY number::int) as new_number
      FROM communities
      WHERE parish_id = v_remove_community.parish_id
    )
    UPDATE communities c
    SET number = n.new_number::text
    FROM numbered n
    WHERE c.id = n.id
      AND c.number != n.new_number::text;
  END IF;

  -- 11. Actualizar actual_brothers
  UPDATE communities
  SET actual_brothers = (
    SELECT COUNT(*) FROM brothers WHERE community_id = p_keep_community_id
  )
  WHERE id = p_keep_community_id;

  RETURN json_build_object(
    'success', true,
    'brothers_moved', v_brothers_moved,
    'members_moved', v_members_moved,
    'removed_community_number', v_remove_community.number
  );
END;
$$;
