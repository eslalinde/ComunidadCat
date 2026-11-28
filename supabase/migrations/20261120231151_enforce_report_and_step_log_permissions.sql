-- Report generation is a distinct permission from reading individual records.
create function public.can_read_reports()
returns boolean language sql stable security invoker set search_path = '' as $$
  select current_user = 'service_role'
    or (public.get_user_role() in ('admin', 'contributor', 'zone_leader')) is true;
$$;
revoke execute on function public.can_read_reports() from public, anon;
grant execute on function public.can_read_reports() to authenticated, service_role;

alter policy community_step_log_select_scoped on public.community_step_log
  to authenticated using (
    (select public.get_user_role()) in ('admin', 'contributor')
    or (
      (select public.get_user_role()) in ('zone_leader', 'zone_contributor', 'viewer')
      and public.can_access_community(community_id)
    )
  );

-- Include the actual grants so the client can detect a partial revocation.
drop function public.get_user_scope();
create function public.get_user_scope()
returns table (
  role public.app_role,
  person_id bigint,
  zone_id bigint,
  community_id bigint,
  has_community_grants boolean,
  granted_community_ids bigint[],
  can_read_reports boolean
)
language sql stable security invoker set search_path = '' as $$
  select p.role, p.person_id, p.zone_id, p.community_id,
         cardinality(grants.ids) > 0, grants.ids, public.can_read_reports()
  from public.profiles p
  cross join lateral (
    select array(
      select a.community_id from public.user_community_access a
      where a.user_id = p.id order by a.community_id
    ) as ids
  ) grants
  where p.id = (select auth.uid());
$$;
revoke execute on function public.get_user_scope() from public, anon;
grant execute on function public.get_user_scope() to authenticated, service_role;

CREATE OR REPLACE VIEW public.view_catechist_teams WITH (security_invoker = true, security_barrier = true) AS
SELECT
    t.id as team_id,
    t.name as team_name,
    tt.name as team_type,
    c.number as community_number,
    p.name as parish_name,
    ci.name as city_name,
    COUNT(b.id) as members_count,
    COALESCE(responsible.person_name, 'Sin asignar') as responsible_name
FROM public.teams t
JOIN public.team_types tt ON t.team_type_id = tt.id
JOIN public.communities c ON t.community_id = c.id
JOIN public.parishes p ON c.parish_id = p.id
JOIN public.cities ci ON p.city_id = ci.id
LEFT JOIN public.belongs b ON t.id = b.team_id
LEFT JOIN (
    SELECT b2.team_id, p2.person_name
    FROM public.belongs b2
    JOIN public.people p2 ON b2.person_id = p2.id
    WHERE b2.is_responsible_for_the_team = true
) responsible ON t.id = responsible.team_id
WHERE (SELECT public.can_read_reports()) AND tt.name = 'Catequistas'
GROUP BY t.id, t.name, tt.name, c.number, p.name, ci.name, responsible.person_name;

CREATE OR REPLACE VIEW public.view_communities_by_parish WITH (security_invoker = true, security_barrier = true) AS
SELECT
    p.id as parish_id,
    p.name as parish_name,
    COALESCE(d.name, 'No especificado') as diocese,
    ci.name as city_name,
    COUNT(c.id) as communities_count,
    COALESCE(SUM(c.actual_brothers), 0) as total_brothers,
    CASE
        WHEN COUNT(c.id) > 0
        THEN ROUND(COALESCE(SUM(c.actual_brothers), 0)::numeric / COUNT(c.id), 2)
        ELSE 0
    END as avg_brothers_per_community,
    STRING_AGG(DISTINCT sw.name, ', ') as step_ways_summary
FROM public.parishes p
JOIN public.cities ci ON p.city_id = ci.id
LEFT JOIN public.dioceses d ON p.diocese_id = d.id
LEFT JOIN public.communities c ON p.id = c.parish_id
LEFT JOIN public.step_ways sw ON c.step_way_id = sw.id
WHERE (SELECT public.can_read_reports())
GROUP BY p.id, p.name, d.name, ci.name
HAVING COUNT(c.id) > 0;

CREATE OR REPLACE VIEW public.view_priests_report WITH (security_invoker = true, security_barrier = true) AS
SELECT
    pr.id as priest_id,
    pe.person_name as priest_name,
    COALESCE(pe.phone, '-') as phone,
    COALESCE(pe.mobile, '-') as mobile,
    COALESCE(pe.email, '-') as email,
    pr.is_parish_priest,
    COALESCE(p.name, 'Sin parroquia asignada') as parish_name,
    COALESCE(d.name, 'No especificado') as diocese,
    COALESCE(ci.name, 'N/A') as city_name,
    COUNT(c.id) as communities_count
FROM public.priests pr
JOIN public.people pe ON pr.person_id = pe.id
LEFT JOIN public.parishes p ON pr.parish_id = p.id
LEFT JOIN public.dioceses d ON p.diocese_id = d.id
LEFT JOIN public.cities ci ON p.city_id = ci.id
LEFT JOIN public.communities c ON p.id = c.parish_id
WHERE (SELECT public.can_read_reports())
GROUP BY pr.id, pe.person_name, pe.phone, pe.mobile, pe.email,
         pr.is_parish_priest, p.name, d.name, ci.name
ORDER BY pe.person_name;

CREATE OR REPLACE FUNCTION public.get_team_stats_by_parish(parish_id_param bigint)
RETURNS TABLE (
    team_type_name text,
    teams_count bigint,
    total_members bigint,
    avg_members_per_team numeric
) AS $$
BEGIN
    IF public.can_read_reports() IS NOT TRUE THEN
        RAISE insufficient_privilege USING MESSAGE = 'Sin permiso para consultar informes';
    END IF;
    RETURN QUERY
    SELECT
        tt.name::text AS team_type_name,
        COUNT(DISTINCT t.id) AS teams_count,
        COUNT(b.id) AS total_members,
        CASE
            WHEN COUNT(DISTINCT t.id) > 0
            THEN ROUND(COUNT(b.id)::numeric / COUNT(DISTINCT t.id), 2)
            ELSE 0
        END AS avg_members_per_team
    FROM public.teams t
    JOIN public.team_types tt ON t.team_type_id = tt.id
    JOIN public.communities c ON t.community_id = c.id
    LEFT JOIN public.belongs b ON t.id = b.team_id
    WHERE c.parish_id = parish_id_param
    GROUP BY tt.name
    ORDER BY teams_count DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_community_progression_stats()
RETURNS TABLE (
    step_way_name text,
    communities_count bigint,
    avg_brothers numeric,
    parishes_count bigint
) AS $$
BEGIN
    IF public.can_read_reports() IS NOT TRUE THEN
        RAISE insufficient_privilege USING MESSAGE = 'Sin permiso para consultar informes';
    END IF;
    RETURN QUERY
    SELECT
        COALESCE(sw.name, 'Sin etapa asignada')::text AS step_way_name,
        COUNT(c.id) AS communities_count,
        ROUND(AVG(c.actual_brothers), 2) AS avg_brothers,
        COUNT(DISTINCT c.parish_id) AS parishes_count
    FROM public.communities c
    LEFT JOIN public.step_ways sw ON c.step_way_id = sw.id
    GROUP BY sw.name
    ORDER BY communities_count DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '';

CREATE OR REPLACE FUNCTION public.get_priest_workload()
RETURNS TABLE (
    priest_name text,
    parish_name text,
    communities_count bigint,
    total_brothers bigint,
    is_parish_priest boolean
) AS $$
BEGIN
    IF public.can_read_reports() IS NOT TRUE THEN
        RAISE insufficient_privilege USING MESSAGE = 'Sin permiso para consultar informes';
    END IF;
    RETURN QUERY
    SELECT
        pe.person_name::text AS priest_name,
        COALESCE(p.name, 'Sin parroquia')::text AS parish_name,
        COUNT(c.id) AS communities_count,
        COALESCE(SUM(c.actual_brothers), 0) AS total_brothers,
        pr.is_parish_priest
    FROM public.priests pr
    JOIN public.people pe ON pr.person_id = pe.id
    LEFT JOIN public.parishes p ON pr.parish_id = p.id
    LEFT JOIN public.communities c ON p.id = c.parish_id
    GROUP BY pe.person_name, p.name, pr.is_parish_priest
    ORDER BY total_brothers DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path = '';
