-- RETURN QUERY requires text expressions for the declared text columns.
-- Preserve each function's signature, aggregates and invoker permissions.
CREATE OR REPLACE FUNCTION public.get_team_stats_by_parish(parish_id_param bigint)
RETURNS TABLE (
    team_type_name text,
    teams_count bigint,
    total_members bigint,
    avg_members_per_team numeric
) AS $$
BEGIN
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
    FROM teams t
    JOIN team_types tt ON t.team_type_id = tt.id
    JOIN communities c ON t.community_id = c.id
    LEFT JOIN belongs b ON t.id = b.team_id
    WHERE c.parish_id = parish_id_param
    GROUP BY tt.name
    ORDER BY teams_count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_community_progression_stats()
RETURNS TABLE (
    step_way_name text,
    communities_count bigint,
    avg_brothers numeric,
    parishes_count bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(sw.name, 'Sin etapa asignada')::text AS step_way_name,
        COUNT(c.id) AS communities_count,
        ROUND(AVG(c.actual_brothers), 2) AS avg_brothers,
        COUNT(DISTINCT c.parish_id) AS parishes_count
    FROM communities c
    LEFT JOIN step_ways sw ON c.step_way_id = sw.id
    GROUP BY sw.name
    ORDER BY communities_count DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.get_priest_workload()
RETURNS TABLE (
    priest_name text,
    parish_name text,
    communities_count bigint,
    total_brothers bigint,
    is_parish_priest boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pe.person_name::text AS priest_name,
        COALESCE(p.name, 'Sin parroquia')::text AS parish_name,
        COUNT(c.id) AS communities_count,
        COALESCE(SUM(c.actual_brothers), 0) AS total_brothers,
        pr.is_parish_priest
    FROM priests pr
    JOIN people pe ON pr.person_id = pe.id
    LEFT JOIN parishes p ON pr.parish_id = p.id
    LEFT JOIN communities c ON p.id = c.parish_id
    GROUP BY pe.person_name, p.name, pr.is_parish_priest
    ORDER BY total_brothers DESC;
END;
$$ LANGUAGE plpgsql;
