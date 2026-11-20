begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(26);
insert into public.cities (id,name) values (-930001,'Contact test');
insert into public.city_zones (id,name,city_id) values (-930001,'A',-930001),(-930002,'B',-930001);
insert into public.parishes (id,name,city_id,zone_id)
values (-930001,'A',-930001,-930001),(-930002,'B',-930001,-930002);
insert into public.communities(id,number,parish_id)
values (-930001,'A',-930001),(-930002,'B',-930002);
insert into public.people(id,person_name) values (-930001,'A'),(-930002,'B'),(-930003,'External');
insert into public.brothers(person_id,community_id) values (-930001,-930001),(-930002,-930002);
create temporary table actors as
select role, gen_random_uuid() as id from unnest(enum_range(null::public.app_role)) role;
insert into auth.users(id,email,raw_user_meta_data) select id,id::text || '@example.invalid','{}' from actors;
update public.profiles p set role=a.role,
 zone_id=case when a.role in ('zone_leader','zone_contributor') then -930001 end,
 community_id=case when a.role='community_responsible' then -930001 end
 from actors a where p.id=a.id;
insert into public.user_community_access(user_id,community_id) select id,-930002 from actors;

select is_empty($matrix$
  with cases as (
    select a.*, person, community, mode,
      exists(select 1 from public.read_person_contacts(a.id,array[person]::bigint[],community,mode)) actual,
      case
        when role='viewer' then false
        when mode='view' and community is null then role in ('admin','contributor') or person=-930001
        when community is null or person<>community then false
        when role in ('admin','contributor') then true
        when community<>-930001 then false
        when role='zone_leader' then true
        when role='community_responsible' then mode in ('view','hermanos')
        else mode='view'
      end expected
    from actors a cross join unnest(array[-930001,-930002,-930003]) person
    cross join unnest(array[-930001,-930002,null]) community
    cross join unnest(array['view','ficha','hermanos','todo']) mode
  ) select role,person,community,mode from cases where actual<>expected
$matrix$, 'All 216 role, membership, context and document combinations');

select ok(not has_function_privilege('authenticated','public.read_person_contacts(uuid,bigint[],bigint,text)','execute'),
 'Application users cannot impersonate an actor in the RPC');
select ok(not has_schema_privilege('authenticated','contact_private','usage'), 'Contacts hidden from direct user queries');
select ok(not has_column_privilege('authenticated','public.profiles','role','update')
 and not has_column_privilege('authenticated','public.profiles','community_id','update')
 and not has_column_privilege('authenticated','public.profiles','zone_id','update'), 'Profile scopes protected');
select ok(not has_function_privilege('anon','public.pending_legacy_contacts()','execute'), 'Legacy queue private');
select throws_ok($$update public.people set phone='synthetic' where id=-930001$$,'23514',null,'Plaintext write rejected');
select public.stage_person_contacts((select id from actors where role='contributor'),
 '[{"ticket":"93000000-0000-4000-8000-000000000001","target":-930001,"envelope":{"data":"synthetic-ciphertext"}}]');
select set_config('request.jwt.claim.sub',(select id::text from actors where role='contributor'),true);
set local role authenticated;
select lives_ok($$update public.people set contact_ticket='93000000-0000-4000-8000-000000000001' where id=-930001$$,
 'Authorized ticket consumed with normal person update');
select throws_ok($$update public.people set contact_ticket='93000000-0000-4000-8000-000000000001' where id=-930001$$,
 'P0001',null,'Used ticket rejected');
reset role;
select is((select count(*) from contact_private.contacts where person_id=-930001),1::bigint,'Encrypted payload stored');
select ok((select phone is null and mobile is null and contact_ticket is null from public.people where id=-930001),
 'Public row has no numbers or ticket');
select is_empty($$select 1 from contact_private.pending where ticket='93000000-0000-4000-8000-000000000001'$$,
 'Ticket removed after commit of statement');
select public.stage_person_contacts((select id from actors where role='contributor'),
 '[{"ticket":"93000000-0000-4000-8000-000000000002","target":null,"envelope":{"data":"synthetic-new"}}]');
set local role authenticated;
select lives_ok($$insert into public.people(id,person_name,contact_ticket)
 values(-930004,'New synthetic person','93000000-0000-4000-8000-000000000002')$$, 'New person and contact inserted together');
reset role;
select is((select envelope->>'data' from contact_private.contacts where person_id=-930004),'synthetic-new','New contact persisted');
insert into contact_private.legacy values(-930003,'synthetic-old',null);
select ok((select migrating from public.read_person_contacts((select id from actors where role='admin'),array[-930003]::bigint[],null,'view')),
 'Pending backfill cannot be mistaken for an empty phone');
select public.finish_legacy_contact(-930003,'{"data":"synthetic-migrated"}');
select ok(not exists(select 1 from contact_private.legacy where person_id=-930003)
 and exists(select 1 from contact_private.contacts where person_id=-930003 and envelope->>'data'='synthetic-migrated'),
 'Backfill atomically replaces its legacy source');
-- Exercise the membership boundary as a scoped caller. Read contacts through
-- the same service-only RPC that the Edge Function calls with the verified actor.
insert into contact_private.contacts values (-930002, '{"data":"outside"}');
select set_config('request.jwt.claim.sub',(select id::text from actors where role='community_responsible'),true);
set local role authenticated;
select throws_ok($$insert into public.brothers(person_id, community_id) values (-930002,-930001)$$,
  '42501', null, 'Cannot add an outside person to gain access to their phone');
select throws_ok($$update public.brothers set person_id=-930002 where person_id=-930001 and community_id=-930001$$,
  '42501', null, 'Cannot substitute an outside person in an existing membership');
select throws_ok($$insert into public.brothers(person_id, community_id) values (-930003,-930001)$$,
  '42501', null, 'An existing person without membership still needs independent authorization');
insert into public.people(id,person_name) values (-930005,'Created by responsible');
select lives_ok($$insert into public.brothers(person_id,community_id) values (-930005,-930001)$$,
  'The creator can complete a normal new-person registration');
reset role;
select is_empty($$select * from public.read_person_contacts(auth.uid(), array[-930002]::bigint[], null, 'view')$$,
  'Outside phone stays unavailable in individual view');
select is_empty($$select * from public.read_person_contacts(auth.uid(), array[-930002]::bigint[], -930001, 'hermanos')$$,
  'Outside phone stays unavailable in the community report');
select is((select envelope->>'data' from public.read_person_contacts(auth.uid(), array[-930001]::bigint[], null, 'view')),
  'synthetic-ciphertext', 'Authorized contact is still returned');
select is_empty($$select person_id from contact_private.first_membership where person_id=-930005$$,
  'First assignment consumes creator permission');
select set_config('request.jwt.claim.sub',(select id::text from actors where role='admin'),true);
set local role authenticated;
select lives_ok($$update public.brothers set community_id=-930002 where person_id=-930005$$,
  'Global manager can transfer a person between zones');
reset role;
select set_config('request.jwt.claim.sub',(select id::text from actors where role='community_responsible'),true);
set local role authenticated;
select throws_ok($$insert into public.brothers(person_id,community_id) values (-930005,-930001)$$,
  '42501', null, 'Creator cannot reclaim a person after a transfer outside their scope');
reset role;
select is_empty($$select * from public.read_person_contacts(auth.uid(), array[-930005]::bigint[], null, 'view')$$,
  'Contact access follows the authorized transfer');
select * from finish();
rollback;
