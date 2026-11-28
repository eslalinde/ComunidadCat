create schema bulk_import_private;
revoke all on schema bulk_import_private from public, anon;
grant usage on schema bulk_import_private to authenticated;

-- A successful import and its receipt commit together. A retry after a lost
-- response returns the same counts without consuming any new contact tickets.
create table bulk_import_private.receipts (
  actor uuid not null default auth.uid() references auth.users(id) on delete cascade,
  community_id bigint not null references public.communities(id) on delete cascade,
  request_id uuid not null,
  result jsonb not null,
  primary key (actor, community_id, request_id)
);
alter table bulk_import_private.receipts enable row level security;
grant select, insert on bulk_import_private.receipts to authenticated;
create policy read_own_receipts on bulk_import_private.receipts for select to authenticated
  using (actor = (select auth.uid()) and public.can_manage_brothers(community_id));
create policy record_own_import on bulk_import_private.receipts for insert to authenticated
  with check (actor = (select auth.uid()) and public.can_manage_brothers(community_id));

-- A community responsible can add members but cannot edit the community row.
-- Limit the privileged write to a database-derived count for the authorized community.
create function bulk_import_private.refresh_brother_count() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.actor is distinct from auth.uid() or public.can_manage_brothers(new.community_id) is not true then
    raise insufficient_privilege;
  end if;
  update public.communities set actual_brothers = (
    select count(*) from public.brothers where community_id = new.community_id
  ) where id = new.community_id;
  return new;
end;
$$;
revoke all on function bulk_import_private.refresh_brother_count() from public, anon, authenticated;
create trigger refresh_brother_count after insert on bulk_import_private.receipts
  for each row execute function bulk_import_private.refresh_brother_count();

create function public.import_community_brothers(p_community bigint, p_request uuid, p_rows jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  item record;
  ids bigint[] := '{}';
  person bigint;
  spouse bigint;
  team bigint;
  marriages integer := 0;
  assigned integer := 0;
  changed integer;
  result_counts jsonb;
begin
  if public.can_manage_brothers(p_community) is not true then
    raise insufficient_privilege using message = 'No tienes permiso para importar hermanos en esta comunidad';
  end if;
  if p_request is null or jsonb_typeof(p_rows) is distinct from 'array' then
    raise exception 'Solicitud de importación inválida';
  end if;
  if jsonb_array_length(p_rows) = 0 then
    raise exception 'La carga debe incluir al menos un hermano';
  end if;
  perform pg_advisory_xact_lock(p_community);
  select r.result into result_counts from bulk_import_private.receipts r
    where r.actor = (select auth.uid()) and r.community_id = p_community and r.request_id = p_request;
  if found then return result_counts; end if;

  for item in select value as row from jsonb_array_elements(p_rows) loop
    insert into public.people(person_name, email, person_type_id, gender_id, is_itinerante, contact_ticket)
      values (item.row->>'person_name', item.row->>'email', (item.row->>'person_type_id')::smallint,
        (item.row->>'gender_id')::smallint, coalesce((item.row->>'is_itinerante')::boolean, false),
        (item.row->>'contact_ticket')::uuid)
      returning id into person;
    insert into public.brothers(person_id, community_id) values (person, p_community);
    ids := array_append(ids, person);
  end loop;

  for item in select value as row, ordinality as pos from jsonb_array_elements(p_rows) with ordinality loop
    person := ids[item.pos];
    if item.row->>'spouse_position' is not null then
      spouse := ids[(item.row->>'spouse_position')::integer];
      if spouse is null or spouse = person then raise exception 'Referencia de cónyuge inválida'; end if;
      update public.people set spouse_id = case when id = person then spouse else person end
        where id in (person, spouse) and spouse_id is null;
      get diagnostics changed = row_count;
      if changed = 2 then
        marriages := marriages + 1;
      elsif changed <> 0 or (select count(*) from public.people
        where (id = person and spouse_id = spouse) or (id = spouse and spouse_id = person)) <> 2 then
        raise exception 'No se pudo vincular el matrimonio';
      end if;
    end if;
    if (item.row->>'responsable')::boolean then
      if team is null then
        select id into team from public.teams
          where community_id = p_community and team_type_id = 4 order by id limit 1;
        if not found then
          insert into public.teams(name, team_type_id, community_id)
            select 'Equipo de Responsables - Comunidad ' || c.number, 4, c.id
            from public.communities c where c.id = p_community returning id into strict team;
        end if;
      end if;
      insert into public.belongs(person_id, team_id, community_id, is_responsible_for_the_team)
        values (person, team, p_community, assigned = 0 and not exists (
          select 1 from public.belongs b where b.team_id = team and b.is_responsible_for_the_team
        ));
      assigned := assigned + 1;
    end if;
  end loop;
  result_counts := jsonb_build_object('peopleCreated', cardinality(ids), 'brothersLinked', cardinality(ids),
    'marriagesLinked', marriages, 'responsablesAssigned', assigned);
  insert into bulk_import_private.receipts(community_id, request_id, result)
    values (p_community, p_request, result_counts);
  return result_counts;
end;
$$;
revoke all on function public.import_community_brothers(bigint,uuid,jsonb) from public, anon;
grant execute on function public.import_community_brothers(bigint,uuid,jsonb) to authenticated;
