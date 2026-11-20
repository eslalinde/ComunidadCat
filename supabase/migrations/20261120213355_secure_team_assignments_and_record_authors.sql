-- A one-element array is non-null even for the national (NULL community) team.
-- This lets one FK enforce both kinds of assignment without reserving an ID.
alter table public.teams
  add column membership_scope bigint[] generated always as (array[community_id]) stored,
  add unique (id, membership_scope);
alter table public.belongs
  add column membership_scope bigint[] generated always as (array[community_id]) stored,
  drop constraint belongs_team_id_fkey,
  add constraint belongs_team_id_fkey foreign key (team_id, membership_scope)
    references public.teams (id, membership_scope) not valid;

-- Existing mismatches require review. Do not silently move their members.
create policy belongs_matching_team on public.belongs as restrictive
  for all to authenticated
  using (exists (
    select 1 from public.teams t where t.id = belongs.team_id
      and t.community_id is not distinct from belongs.community_id
  ))
  with check (exists (
    select 1 from public.teams t where t.id = belongs.team_id
      and t.community_id is not distinct from belongs.community_id
  ));

do $$
begin
  if not exists (
    select 1 from public.belongs b join public.teams t on t.id = b.team_id
    where b.community_id is distinct from t.community_id
  ) then
    alter table public.belongs validate constraint belongs_team_id_fkey;
  end if;
end $$;

create function public.set_community_record_author() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  new.created_by := auth.uid();
  return new;
end;
$$;
revoke all on function public.set_community_record_author() from public, anon, authenticated;
create trigger set_visit_author before insert on public.community_visits
  for each row when (current_user = 'authenticated') execute function public.set_community_record_author();
create trigger set_inventory_author before insert on public.community_inventory
  for each row when (current_user = 'authenticated') execute function public.set_community_record_author();

-- Keep FK cleanup by the database possible when an auth account is deleted.
revoke update on public.community_visits, public.community_inventory from authenticated;
grant update (community_id, visit_date, description, topics_discussed, visitor_name, updated_at)
  on public.community_visits to authenticated;
grant update (community_id, item_type_id, custom_name, quantity, condition, notes, updated_at)
  on public.community_inventory to authenticated;
