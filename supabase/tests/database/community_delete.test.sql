-- Integration contract: reference team types exist and an audited community
-- (with a leaders team) can be deleted by an admin. Independent of seed.sql.
-- Run with: npm run test:integration (repository root).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(8);

select is(
  (select count(*)::int from public.team_types where id in (3, 4)),
  2,
  'Team types used by the app (3 Catequistas, 4 Responsables) exist'
);

insert into public.cities (id, name) values (-920001, 'Delete contract city');
insert into public.city_zones (id, name, city_id) values (-920001, 'Delete contract zone', -920001);
insert into public.parishes (id, name, city_id, zone_id)
values (-920001, 'Delete contract parish', -920001, -920001);

-- The production signup trigger creates the profile.
insert into auth.users (id, email, raw_user_meta_data)
values ('92000000-0000-0000-0000-000000000001', 'delete-contract@test.local', '{}'::jsonb);
update public.profiles set role = 'admin' where id = '92000000-0000-0000-0000-000000000001';

-- Act as the application's database role so the audit trigger records changes.
set local role authenticated;
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$ insert into public.communities (id, number, parish_id) values (-920001, 'Delete contract', -920001) $$,
  'Admin creates a community'
);

select lives_ok(
  $$ insert into public.teams (id, name, team_type_id, community_id)
     values (-920001, 'Equipo de Responsables - Comunidad Delete contract', 4, -920001) $$,
  'Admin creates the leaders team with team type 4'
);

select ok(
  exists (select 1 from public.audit_log where table_name = 'communities' and record_id = -920001),
  'Community creation is audited'
);

select lives_ok(
  $$ delete from public.teams where community_id = -920001 $$,
  'Admin deletes the community teams'
);

select lives_ok(
  $$ delete from public.communities where id = -920001 $$,
  'Admin deletes an audited community'
);

select is(
  (select count(*)::int from public.communities where id = -920001),
  0,
  'Community is gone'
);

select ok(
  exists (
    select 1 from public.audit_log
    where table_name = 'communities' and record_id = -920001
      and operation = 'DELETE' and community_id = -920001
  ),
  'Audit history keeps the deleted community id'
);

reset role;
select * from finish();
rollback;
