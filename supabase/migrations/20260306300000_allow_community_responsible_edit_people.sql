-- ==============================================
-- Allow community_responsible to UPDATE people records
-- ==============================================
-- A community responsible can create new people and also
-- edit existing people records (e.g., update phone, email)
-- for people who are brothers in their assigned community.
-- ==============================================

DROP POLICY IF EXISTS "people_update_scoped" ON public.people;
CREATE POLICY "people_update_scoped" ON public.people
  FOR UPDATE TO authenticated
  USING (
    public.is_contributor_or_admin()
    OR public.get_user_role() IN ('zone_leader', 'zone_contributor')
    OR (
      public.get_user_role() = 'community_responsible'
      AND EXISTS (
        SELECT 1 FROM public.brothers b
        WHERE b.person_id = people.id
          AND b.community_id = public.get_user_community_id()
      )
    )
  )
  WITH CHECK (
    public.is_contributor_or_admin()
    OR public.get_user_role() IN ('zone_leader', 'zone_contributor')
    OR (
      public.get_user_role() = 'community_responsible'
      AND EXISTS (
        SELECT 1 FROM public.brothers b
        WHERE b.person_id = people.id
          AND b.community_id = public.get_user_community_id()
      )
    )
  );
