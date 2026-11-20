-- All callers, including SECURITY DEFINER RPCs, require a positive zone match.
create or replace function public.can_manage_community(p_community_id bigint)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and (p.role in ('admin', 'contributor')
        or (p.role in ('zone_leader', 'zone_contributor')
          and p.zone_id = public.get_community_zone_id(p_community_id)))
  );
$$;

-- The UI creates a person and their first membership in separate requests.
-- Only the original creator gets this one-time permission for an unlinked row.
create table contact_private.first_membership (
  person_id bigint primary key references public.people(id) on delete cascade,
  actor uuid not null references auth.users(id) on delete cascade
);
alter table contact_private.first_membership enable row level security;
revoke all on contact_private.first_membership from public, anon, authenticated;

create function contact_private.remember_person_creator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into contact_private.first_membership(person_id, actor)
  values (new.id, auth.uid());
  return new;
end;
$$;
create trigger remember_person_creator after insert on public.people
for each row when (current_user = 'authenticated')
execute function contact_private.remember_person_creator();

create function contact_private.check_membership_person() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  creator uuid;
begin
  -- Serialize first assignments against other managers, including global roles.
  select actor into creator from contact_private.first_membership
  where person_id = new.person_id for update;

  if auth.uid() is not null
    and public.is_contributor_or_admin() is not true
    and creator is distinct from auth.uid()
    and not contact_private.allowed(auth.uid(), new.person_id, null, 'view') then
    raise insufficient_privilege using message =
      'Se requiere autorización para vincular a una persona fuera de tu ámbito';
  end if;
  return new;
end;
$$;
create trigger check_membership_person before insert or update of person_id, community_id
on public.brothers for each row execute function contact_private.check_membership_person();

-- Consume only after an actual write (INSERT ... ON CONFLICT may skip a row).
create function contact_private.finish_first_membership() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from contact_private.first_membership where person_id = new.person_id;
  return new;
end;
$$;
create trigger finish_first_membership after insert or update of person_id, community_id
on public.brothers for each row execute function contact_private.finish_first_membership();

revoke all on function contact_private.remember_person_creator(),
  contact_private.check_membership_person(), contact_private.finish_first_membership()
  from public, anon, authenticated;
