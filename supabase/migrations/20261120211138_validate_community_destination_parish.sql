-- USING checks the original community. WITH CHECK must authorize the proposed parish.
alter policy communities_update_scoped on public.communities
  with check (
    (select public.is_contributor_or_admin())
    or (
      (select public.get_user_role()) in ('zone_leader', 'zone_contributor')
      and exists (
        select 1 from public.parishes p
        where p.id = communities.parish_id
          and p.zone_id = (select public.get_user_zone_id())
      )
    )
  );
