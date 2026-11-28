-- Only the authenticated Edge Function has the encryption key. Legacy columns
-- remain NULL so existing PostgREST joins and the report view keep their shape.
create schema if not exists contact_private;
revoke all on schema contact_private from public, anon, authenticated;
create table contact_private.contacts (
  person_id bigint primary key references public.people(id) on delete cascade,
  envelope jsonb not null
);
create table contact_private.pending (
  ticket uuid primary key, actor uuid not null, target bigint,
  envelope jsonb not null, expires_at timestamptz not null default now() + interval '10 minutes'
);
create index on contact_private.pending(expires_at);
create table contact_private.legacy (
  person_id bigint primary key references public.people(id) on delete cascade,
  phone text, mobile text
);
revoke all on all tables in schema contact_private from public, anon, authenticated;
alter table contact_private.contacts enable row level security;
alter table contact_private.pending enable row level security;
alter table contact_private.legacy enable row level security;

alter table public.people add column contact_ticket uuid;
insert into contact_private.legacy select id, phone, mobile from public.people
where phone is not null or mobile is not null;
update public.people set phone=null, mobile=null where phone is not null or mobile is not null;
alter table public.people add constraint people_contacts_private check
  (phone is null and mobile is null);

-- Signup and administrative role assignment already use SECURITY DEFINER RPCs.
revoke insert, update on public.profiles from public, anon, authenticated;
grant update(full_name, username, website, avatar_url, updated_at, feature_flags)
  on public.profiles to authenticated;

create function contact_private.allowed(p_actor uuid, p_person bigint, p_community bigint, p_mode text)
returns boolean language sql stable set search_path='' as $$
  select exists (
    select 1 from public.profiles u
    where u.id=p_actor and u.role <> 'viewer'
    and (p_mode='view' or (p_mode in ('hermanos','ficha','todo') and p_community is not null
      and (u.role in ('admin','contributor','zone_leader')
           or (u.role='community_responsible' and p_mode='hermanos'))))
    and ((p_mode='view' and p_community is null and u.role in ('admin','contributor'))
      or exists (
        select 1 from public.brothers b join public.communities c on c.id=b.community_id
        left join public.parishes par on par.id=c.parish_id
        where b.person_id=p_person and (p_community is null or c.id=p_community)
        and (u.role in ('admin','contributor')
          or (u.role in ('zone_leader','zone_contributor') and par.zone_id=u.zone_id)
          or (u.role='community_responsible' and c.id=u.community_id))
      ))
  )
$$;

-- These RPCs are granted exclusively to service_role. The Edge Function
-- supplies the actor returned by Supabase Auth, never a client-supplied actor.
create function public.read_person_contacts(p_actor uuid, p_ids bigint[], p_community bigint, p_mode text)
returns table(person_id bigint, envelope jsonb, migrating boolean) language sql stable security definer set search_path='' as $$
  select p.id, cc.envelope, exists(select 1 from contact_private.legacy l where l.person_id=p.id)
  from public.people p
  left join contact_private.contacts cc on cc.person_id=p.id
  where p.id=any(p_ids) and contact_private.allowed(p_actor,p.id,p_community,p_mode)
$$;

create function public.stage_person_contacts(p_actor uuid, p_items jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.profiles where id=p_actor and role <> 'viewer') then
    raise insufficient_privilege;
  end if;
  delete from contact_private.pending where expires_at <= now();
  insert into contact_private.pending(ticket,actor,target,envelope)
    select ticket,p_actor,target,envelope from jsonb_to_recordset(p_items)
      as x(ticket uuid,target bigint,envelope jsonb);
end $$;

create function contact_private.consume_ticket() returns trigger
language plpgsql security definer set search_path='' as $$
declare payload jsonb;
begin
  if not exists(select 1 from public.profiles where id=auth.uid() and role <> 'viewer')
    or (tg_op='UPDATE' and (old.id<>new.id or not contact_private.allowed(auth.uid(),old.id,null,'view'))) then
    raise insufficient_privilege;
  end if;
  delete from contact_private.pending where ticket=new.contact_ticket and actor=auth.uid()
    and expires_at>now() and target is not distinct from (case when tg_op='UPDATE' then old.id end)
    returning envelope into payload;
  if not found then raise exception 'Autorización de contacto no válida'; end if;
  insert into contact_private.contacts(person_id,envelope) values(new.id,payload)
    on conflict(person_id) do update set envelope=excluded.envelope;
  delete from contact_private.legacy where person_id=new.id;
  update public.people set contact_ticket=null where id=new.id;
  return null;
end $$;
-- AFTER runs only for rows actually written, including INSERT ... ON CONFLICT.
create trigger consume_contact_ticket after insert or update of contact_ticket on public.people
for each row when (new.contact_ticket is not null) execute function contact_private.consume_ticket();

-- The legacy queue is closed to application roles. Only remove an original in
-- the transaction which installs its verified ciphertext. Concurrent edits win.
create function public.pending_legacy_contacts()
returns table(person_id bigint, phone text, mobile text)
language sql security definer set search_path='' as $$
  select l.person_id,l.phone,l.mobile from contact_private.legacy l order by l.person_id limit 100
$$;
create function public.finish_legacy_contact(p_person bigint, p_envelope jsonb)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.people where id=p_person for update;
  delete from contact_private.legacy where person_id=p_person;
  if found then
    insert into contact_private.contacts values(p_person,p_envelope) on conflict do nothing;
  end if;
end $$;

revoke all on function public.read_person_contacts(uuid,bigint[],bigint,text),
  public.stage_person_contacts(uuid,jsonb),public.pending_legacy_contacts(),
  public.finish_legacy_contact(bigint,jsonb) from public,anon,authenticated;
grant execute on function public.read_person_contacts(uuid,bigint[],bigint,text),
  public.stage_person_contacts(uuid,jsonb),public.pending_legacy_contacts(),
  public.finish_legacy_contact(bigint,jsonb) to service_role;
