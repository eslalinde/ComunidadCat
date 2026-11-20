-- Security hardening based on the Supabase security checklist and advisors.
--
-- 1. Users could escalate their own privileges: profiles_update_own allowed
--    `update profiles set role = 'admin' where id = auth.uid()`. A trigger now
--    blocks changes to role and scope columns unless the caller is an admin or
--    a privileged RPC/migration (which runs as the function/table owner).
-- 2. Anyone can sign up (new users get an unscoped `viewer` profile), and the
--    `people` table (names, phones, e-mails) was readable by every
--    authenticated user. Only users with an assigned role/scope can read it now.
-- 3. The app never uses the `anon` role for data: remove every privilege it had
--    on public tables, sequences and functions (least privilege, Data API).
-- 4. Policies created for `public` now target `authenticated`, use
--    `(select auth.uid())` (auth_rls_initplan) and state explicit WITH CHECKs.
-- 5. Pin search_path on every function in public (function_search_path_mutable).

-- ---------------------------------------------------------------------------
-- 1. Protect privileged profile columns
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER on purpose: current_user must be the caller's role. Inside
-- SECURITY DEFINER RPCs (set_user_role, handle_new_user) or migrations it is
-- the owner, so those trusted paths are not restricted.
create or replace function public.protect_profile_privileged_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.role := 'viewer'::public.app_role;
    new.zone_id := null;
    new.community_id := null;
    new.person_id := null;
    return new;
  end if;

  if new.role is distinct from old.role
    or new.zone_id is distinct from old.zone_id
    or new.community_id is distinct from old.community_id
    or new.person_id is distinct from old.person_id then
    raise exception 'No tienes permisos para modificar el rol o el alcance del perfil'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged_columns on public.profiles;
create trigger profiles_protect_privileged_columns
  before insert or update on public.profiles
  for each row execute function public.protect_profile_privileged_columns();

-- ---------------------------------------------------------------------------
-- 2. Restrict the people directory to users with an assigned scope
-- ---------------------------------------------------------------------------
create or replace function public.has_assigned_scope()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and (
        p.role in ('admin', 'contributor', 'zone_leader', 'zone_contributor', 'community_responsible')
        or p.zone_id is not null
        or p.community_id is not null
        or exists (
          select 1 from public.user_community_access uca where uca.user_id = p.id
        )
      )
  );
$$;

alter policy people_select_authenticated on public.people rename to people_select_scoped;
alter policy people_select_scoped on public.people
  to authenticated
  using (
    public.has_assigned_scope()
    or id = (select p.person_id from public.profiles p where p.id = (select auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 3. Least privilege for the Data API roles
-- ---------------------------------------------------------------------------
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from public, anon;

grant execute on all functions in schema public to authenticated, service_role;
-- Trigger functions are never called through the API.
revoke execute on function
  public.audit_log_prevent_tampering(),
  public.audit_log_trigger(),
  public.handle_new_user(),
  public.handle_updated_at(),
  public.protect_profile_privileged_columns()
from authenticated;

-- Future objects created by migrations (role postgres) are not exposed to anon.
alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on functions from anon;

-- ---------------------------------------------------------------------------
-- 4. Policies: target authenticated, cache auth.uid(), explicit WITH CHECK
-- ---------------------------------------------------------------------------
alter policy profiles_select_own on public.profiles
  to authenticated using ((select auth.uid()) = id);
alter policy profiles_insert_own on public.profiles
  to authenticated with check ((select auth.uid()) = id);
alter policy profiles_update_own on public.profiles
  to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
alter policy profiles_update_admin on public.profiles
  to authenticated using (public.is_admin()) with check (public.is_admin());

alter policy audit_log_select on public.audit_log
  to authenticated using (public.is_admin() or user_id = (select auth.uid()));

alter policy uca_select on public.user_community_access
  to authenticated
  using (
    public.get_user_role() = any (array['admin', 'contributor']::public.app_role[])
    or user_id = (select auth.uid())
    or (public.get_user_role() = 'zone_leader'::public.app_role and public.can_manage_community(community_id))
  );

alter policy inventory_item_types_select on public.inventory_item_types
  to authenticated using (true);
alter policy inventory_item_types_insert on public.inventory_item_types
  to authenticated with check (public.is_contributor_or_admin());
alter policy inventory_item_types_update on public.inventory_item_types
  to authenticated using (public.is_contributor_or_admin()) with check (public.is_contributor_or_admin());
alter policy inventory_item_types_delete on public.inventory_item_types
  to authenticated using (public.is_admin());

alter policy community_inventory_select_scoped on public.community_inventory
  to authenticated using (public.can_access_community(community_id));
alter policy community_inventory_insert on public.community_inventory
  to authenticated with check (public.can_manage_brothers(community_id));
alter policy community_inventory_update on public.community_inventory
  to authenticated
  using (public.can_manage_brothers(community_id))
  with check (public.can_manage_brothers(community_id));
alter policy community_inventory_delete on public.community_inventory
  to authenticated
  using (public.is_admin() or (created_by = (select auth.uid()) and public.can_manage_brothers(community_id)));

alter policy community_visits_select_scoped on public.community_visits
  to authenticated using (public.can_access_community(community_id));
alter policy community_visits_insert on public.community_visits
  to authenticated with check (public.can_manage_brothers(community_id));
alter policy community_visits_update on public.community_visits
  to authenticated
  using (public.can_manage_brothers(community_id))
  with check (public.can_manage_brothers(community_id));
alter policy community_visits_delete on public.community_visits
  to authenticated
  using (public.is_admin() or (created_by = (select auth.uid()) and public.can_manage_brothers(community_id)));

-- ---------------------------------------------------------------------------
-- 5. Pin search_path (pg_temp last so temporary objects cannot shadow tables)
-- ---------------------------------------------------------------------------
do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and p.proname not in ('protect_profile_privileged_columns', 'has_assigned_scope', 'handle_new_user')
      and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('alter function %s set search_path = public, pg_temp', fn);
  end loop;
end;
$$;
