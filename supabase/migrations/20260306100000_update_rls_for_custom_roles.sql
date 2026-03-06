-- ==============================================
-- UPDATE RLS POLICIES FOR CUSTOM ROLES
-- ==============================================
-- Adjust policies on community-related tables so that
-- zone_leader, zone_contributor, and community_responsible
-- have scoped access.
--
-- Master tables (countries, states, cities, step_ways, team_types,
-- dioceses, city_zones) keep their existing global policies:
-- SELECT=all, INSERT/UPDATE=contributor+admin, DELETE=admin.
-- Zone/community roles get read access to these via the existing
-- "select_authenticated" policies.
--
-- Transactional tables get scoped INSERT/UPDATE/DELETE.
-- ==============================================

-- ==============================================
-- COMMUNITIES
-- ==============================================
-- SELECT: zone/community roles need scoped reads
DROP POLICY IF EXISTS "communities_select_authenticated" ON public.communities;
CREATE POLICY "communities_select_authenticated" ON public.communities
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor', 'viewer')
    OR public.can_access_community(id)
  );

-- INSERT: admin, contributor globally; zone_leader in their zone
DROP POLICY IF EXISTS "communities_insert_contributor_admin" ON public.communities;
CREATE POLICY "communities_insert_scoped" ON public.communities
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND parish_id IS NOT NULL
      AND public.get_community_zone_id(
        -- For INSERT we need to check the zone of the parish
        -- but the community doesn't exist yet; use a subquery
        currval(pg_get_serial_sequence('communities', 'id'))
      ) IS NOT NULL
    )
  );

-- Actually, for INSERT the community doesn't have an id yet.
-- Let's use a simpler approach: zone_leader can insert if the
-- parish belongs to their zone.
DROP POLICY IF EXISTS "communities_insert_scoped" ON public.communities;
CREATE POLICY "communities_insert_scoped" ON public.communities
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND parish_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.parishes p
        WHERE p.id = parish_id
          AND p.zone_id = public.get_user_zone_id()
      )
    )
  );

-- UPDATE: admin, contributor globally; zone roles for their zone
DROP POLICY IF EXISTS "communities_update_contributor_admin" ON public.communities;
CREATE POLICY "communities_update_scoped" ON public.communities
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND public.can_manage_community(id)
    )
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND public.can_manage_community(id)
    )
  );

-- DELETE: admin only (globally)
-- zone_leader can delete communities in their zone
DROP POLICY IF EXISTS "communities_delete_admin" ON public.communities;
CREATE POLICY "communities_delete_scoped" ON public.communities
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND public.can_manage_community(id)
    )
  );

-- ==============================================
-- BROTHERS
-- ==============================================
-- SELECT: scoped by community access
DROP POLICY IF EXISTS "brothers_select_authenticated" ON public.brothers;
CREATE POLICY "brothers_select_scoped" ON public.brothers
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor', 'viewer')
    OR public.can_access_community(community_id)
  );

-- INSERT: anyone who can manage brothers in that community
DROP POLICY IF EXISTS "brothers_insert_contributor_admin" ON public.brothers;
CREATE POLICY "brothers_insert_scoped" ON public.brothers
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR public.can_manage_brothers(community_id)
  );

-- UPDATE: anyone who can manage brothers
DROP POLICY IF EXISTS "brothers_update_contributor_admin" ON public.brothers;
CREATE POLICY "brothers_update_scoped" ON public.brothers
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR public.can_manage_brothers(community_id)
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR public.can_manage_brothers(community_id)
  );

-- DELETE: admin, contributor, zone roles for their zone, community_responsible for their community
DROP POLICY IF EXISTS "brothers_delete_admin" ON public.brothers;
CREATE POLICY "brothers_delete_scoped" ON public.brothers
  FOR DELETE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR public.can_manage_brothers(community_id)
  );

-- ==============================================
-- PEOPLE
-- ==============================================
-- SELECT: all authenticated (people are shared across communities)
-- (keep existing policy — already allows all authenticated)

-- INSERT: community_responsible can create people (for adding brothers)
DROP POLICY IF EXISTS "people_insert_contributor_admin" ON public.people;
CREATE POLICY "people_insert_scoped" ON public.people
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR public.get_user_role() IN ('zone_leader', 'zone_contributor', 'community_responsible')
  );

-- UPDATE: contributor+admin globally; zone roles; community_responsible cannot edit people
DROP POLICY IF EXISTS "people_update_contributor_admin" ON public.people;
CREATE POLICY "people_update_scoped" ON public.people
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR public.get_user_role() IN ('zone_leader', 'zone_contributor')
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR public.get_user_role() IN ('zone_leader', 'zone_contributor')
  );

-- DELETE: admin only (keep existing)
-- (people_delete_admin policy already exists)

-- ==============================================
-- TEAMS
-- ==============================================
-- SELECT: scoped by community access
DROP POLICY IF EXISTS "teams_select_authenticated" ON public.teams;
CREATE POLICY "teams_select_scoped" ON public.teams
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor', 'viewer')
    OR community_id IS NULL  -- national teams visible to all
    OR public.can_access_community(community_id)
  );

-- INSERT: admin, contributor, zone_leader for their zone
DROP POLICY IF EXISTS "teams_insert_contributor_admin" ON public.teams;
CREATE POLICY "teams_insert_scoped" ON public.teams
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND community_id IS NOT NULL
      AND public.can_manage_community(community_id)
    )
  );

-- UPDATE: admin, contributor, zone_leader/zone_contributor for their zone
DROP POLICY IF EXISTS "teams_update_contributor_admin" ON public.teams;
CREATE POLICY "teams_update_scoped" ON public.teams
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND community_id IS NOT NULL
      AND public.can_manage_community(community_id)
    )
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND community_id IS NOT NULL
      AND public.can_manage_community(community_id)
    )
  );

-- DELETE: admin, contributor, zone_leader for their zone
DROP POLICY IF EXISTS "teams_delete_contributor_admin" ON public.teams;
DROP POLICY IF EXISTS "teams_delete_admin" ON public.teams;
CREATE POLICY "teams_delete_scoped" ON public.teams
  FOR DELETE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND community_id IS NOT NULL
      AND public.can_manage_community(community_id)
    )
  );

-- ==============================================
-- BELONGS
-- ==============================================
-- SELECT: scoped by community access
DROP POLICY IF EXISTS "belongs_select_authenticated" ON public.belongs;
CREATE POLICY "belongs_select_scoped" ON public.belongs
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor', 'viewer')
    OR community_id IS NULL
    OR public.can_access_community(community_id)
  );

-- INSERT: admin, contributor, zone roles for their zone
DROP POLICY IF EXISTS "belongs_insert_contributor_admin" ON public.belongs;
CREATE POLICY "belongs_insert_scoped" ON public.belongs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND community_id IS NOT NULL
      AND public.can_manage_community(community_id)
    )
  );

-- UPDATE: admin, contributor, zone roles
DROP POLICY IF EXISTS "belongs_update_contributor_admin" ON public.belongs;
CREATE POLICY "belongs_update_scoped" ON public.belongs
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND community_id IS NOT NULL
      AND public.can_manage_community(community_id)
    )
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND community_id IS NOT NULL
      AND public.can_manage_community(community_id)
    )
  );

-- DELETE: admin, contributor, zone roles
DROP POLICY IF EXISTS "belongs_delete_contributor_admin" ON public.belongs;
DROP POLICY IF EXISTS "belongs_delete_admin" ON public.belongs;
CREATE POLICY "belongs_delete_scoped" ON public.belongs
  FOR DELETE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND community_id IS NOT NULL
      AND public.can_manage_community(community_id)
    )
  );

-- ==============================================
-- COMMUNITY_STEP_LOG
-- ==============================================
-- SELECT: scoped
DROP POLICY IF EXISTS "community_step_log_select_authenticated" ON public.community_step_log;
CREATE POLICY "community_step_log_select_scoped" ON public.community_step_log
  FOR SELECT TO authenticated
  USING (
    public.get_user_role() IN ('admin', 'contributor', 'viewer')
    OR public.can_access_community(community_id)
  );

-- INSERT: admin, contributor, zone roles
DROP POLICY IF EXISTS "community_step_log_insert_contributor_admin" ON public.community_step_log;
CREATE POLICY "community_step_log_insert_scoped" ON public.community_step_log
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND public.can_manage_community(community_id)
    )
  );

-- UPDATE: admin, contributor, zone roles
DROP POLICY IF EXISTS "community_step_log_update_contributor_admin" ON public.community_step_log;
CREATE POLICY "community_step_log_update_scoped" ON public.community_step_log
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND public.can_manage_community(community_id)
    )
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND public.can_manage_community(community_id)
    )
  );

-- DELETE: admin, zone_leader
DROP POLICY IF EXISTS "community_step_log_delete_admin" ON public.community_step_log;
CREATE POLICY "community_step_log_delete_scoped" ON public.community_step_log
  FOR DELETE TO authenticated
  USING (
    public.is_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND public.can_manage_community(community_id)
    )
  );

-- ==============================================
-- PARISHES
-- ==============================================
-- SELECT: all authenticated (keep existing)
-- INSERT: admin, contributor, zone_leader for their zone
DROP POLICY IF EXISTS "parishes_insert_contributor_admin" ON public.parishes;
CREATE POLICY "parishes_insert_scoped" ON public.parishes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND zone_id IS NOT NULL
      AND zone_id = public.get_user_zone_id()
    )
  );

-- UPDATE: admin, contributor, zone_leader/zone_contributor for their zone
DROP POLICY IF EXISTS "parishes_update_contributor_admin" ON public.parishes;
CREATE POLICY "parishes_update_scoped" ON public.parishes
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND zone_id IS NOT NULL
      AND zone_id = public.get_user_zone_id()
    )
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND zone_id IS NOT NULL
      AND zone_id = public.get_user_zone_id()
    )
  );

-- DELETE: admin only (keep existing)

-- ==============================================
-- PRIESTS
-- ==============================================
-- INSERT: admin, contributor, zone_leader for their zone
DROP POLICY IF EXISTS "priests_insert_contributor_admin" ON public.priests;
CREATE POLICY "priests_insert_scoped" ON public.priests
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND EXISTS (
        SELECT 1 FROM public.parishes p
        WHERE p.id = parish_id
          AND p.zone_id = public.get_user_zone_id()
      )
    )
  );

-- UPDATE: admin, contributor, zone roles
DROP POLICY IF EXISTS "priests_update_contributor_admin" ON public.priests;
CREATE POLICY "priests_update_scoped" ON public.priests
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND EXISTS (
        SELECT 1 FROM public.parishes p
        WHERE p.id = parish_id
          AND p.zone_id = public.get_user_zone_id()
      )
    )
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND EXISTS (
        SELECT 1 FROM public.parishes p
        WHERE p.id = parish_id
          AND p.zone_id = public.get_user_zone_id()
      )
    )
  );

-- DELETE: admin only (keep existing)

-- ==============================================
-- AUDIT_LOG
-- ==============================================
-- Update: community_responsible can see only their own actions
-- (the existing policy already does "is_admin OR user_id = auth.uid()")
-- This naturally works: community_responsible sees only their own logs.
-- No change needed.

-- ==============================================
-- PARISH_TEAMS
-- ==============================================
-- INSERT: add zone_leader
DROP POLICY IF EXISTS "parish_teams_insert_contributor_admin" ON public.parish_teams;
CREATE POLICY "parish_teams_insert_scoped" ON public.parish_teams
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND EXISTS (
        SELECT 1 FROM public.parishes p
        WHERE p.id = parish_id
          AND p.zone_id = public.get_user_zone_id()
      )
    )
  );

-- UPDATE: add zone roles
DROP POLICY IF EXISTS "parish_teams_update_contributor_admin" ON public.parish_teams;
CREATE POLICY "parish_teams_update_scoped" ON public.parish_teams
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND EXISTS (
        SELECT 1 FROM public.parishes p
        WHERE p.id = parish_id
          AND p.zone_id = public.get_user_zone_id()
      )
    )
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() IN ('zone_leader', 'zone_contributor')
      AND EXISTS (
        SELECT 1 FROM public.parishes p
        WHERE p.id = parish_id
          AND p.zone_id = public.get_user_zone_id()
      )
    )
  );

-- DELETE: add zone_leader
DROP POLICY IF EXISTS "parish_teams_delete_contributor_admin" ON public.parish_teams;
DROP POLICY IF EXISTS "parish_teams_delete_admin" ON public.parish_teams;
CREATE POLICY "parish_teams_delete_scoped" ON public.parish_teams
  FOR DELETE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR (
      public.get_user_role() = 'zone_leader'
      AND EXISTS (
        SELECT 1 FROM public.parishes p
        WHERE p.id = parish_id
          AND p.zone_id = public.get_user_zone_id()
      )
    )
  );
