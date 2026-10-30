-- Integration contract: real RLS and RPCs, independent of seed.sql and E2E users.
-- Run with: npm run test:integration (repository root).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(35);

insert into public.cities (id, name) values (-910001, 'Integration city');
insert into public.city_zones (id, name, city_id) values
  (-910001, 'Integration zone A', -910001), (-910002, 'Integration zone B', -910001);
insert into public.parishes (id, name, city_id, zone_id) values
  (-910001, 'Integration parish A', -910001, -910001),
  (-910002, 'Integration parish B', -910001, -910002);
insert into public.communities (id, number, parish_id) values
  (-910001, 'Integration A', -910001), (-910002, 'Integration B', -910002);

-- The production signup trigger creates each profile.
insert into auth.users (id, email, raw_user_meta_data)
select ('91000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'integration-' || n || '@test.local', '{}'::jsonb
from generate_series(1, 9) n;

update public.profiles set role = 'admin' where id = '91000000-0000-0000-0000-000000000001';
update public.profiles set role = 'contributor' where id = '91000000-0000-0000-0000-000000000002';
update public.profiles set role = 'zone_leader', zone_id = -910001 where id = '91000000-0000-0000-0000-000000000003';
update public.profiles set role = 'zone_contributor', zone_id = -910001 where id = '91000000-0000-0000-0000-000000000004';
update public.profiles set role = 'community_responsible', community_id = -910001 where id = '91000000-0000-0000-0000-000000000005';
update public.profiles set zone_id = -910001 where id = '91000000-0000-0000-0000-000000000006';
update public.profiles set community_id = -910001 where id = '91000000-0000-0000-0000-000000000007';
insert into public.user_community_access (user_id, community_id, granted_by)
values ('91000000-0000-0000-0000-000000000008', -910002, '91000000-0000-0000-0000-000000000001');

select ok(
  (select bool_and(relrowsecurity) from pg_class where oid in
    ('public.communities'::regclass, 'public.brothers'::regclass, 'public.profiles'::regclass, 'public.user_community_access'::regclass)),
  'RLS enabled on critical tables'
);

-- Test as the application's database role, never as postgres/service_role.
set local role authenticated;

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[-910002, -910001]::bigint[], 'admin: exact visible communities'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910001 returning id)
select is((select count(*) from changed),
  1::bigint, 'admin: update community A'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910002 returning id)
select is((select count(*) from changed),
  1::bigint, 'admin: update community B'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[-910002, -910001]::bigint[], 'contributor: exact visible communities'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910001 returning id)
select is((select count(*) from changed),
  1::bigint, 'contributor: update community A'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910002 returning id)
select is((select count(*) from changed),
  1::bigint, 'contributor: update community B'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000003', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[-910001]::bigint[], 'zone_leader: exact visible communities'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910001 returning id)
select is((select count(*) from changed),
  1::bigint, 'zone_leader: update community A'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910002 returning id)
select is((select count(*) from changed),
  0::bigint, 'zone_leader: update community B'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000004', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[-910001]::bigint[], 'zone_contributor: exact visible communities'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910001 returning id)
select is((select count(*) from changed),
  1::bigint, 'zone_contributor: update community A'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910002 returning id)
select is((select count(*) from changed),
  0::bigint, 'zone_contributor: update community B'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000005', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[-910001]::bigint[], 'community_responsible: exact visible communities'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910001 returning id)
select is((select count(*) from changed),
  0::bigint, 'community_responsible: update community A'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910002 returning id)
select is((select count(*) from changed),
  0::bigint, 'community_responsible: update community B'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000006', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[-910001]::bigint[], 'viewer_zone: exact visible communities'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910001 returning id)
select is((select count(*) from changed),
  0::bigint, 'viewer_zone: update community A'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910002 returning id)
select is((select count(*) from changed),
  0::bigint, 'viewer_zone: update community B'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000007', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[-910001]::bigint[], 'viewer_community: exact visible communities'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910001 returning id)
select is((select count(*) from changed),
  0::bigint, 'viewer_community: update community A'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910002 returning id)
select is((select count(*) from changed),
  0::bigint, 'viewer_community: update community B'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000008', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[-910002]::bigint[], 'viewer_grant: exact visible communities'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910001 returning id)
select is((select count(*) from changed),
  0::bigint, 'viewer_grant: update community A'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910002 returning id)
select is((select count(*) from changed),
  0::bigint, 'viewer_grant: update community B'
);

select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000009', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[]::bigint[], 'viewer_no_scope: exact visible communities'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910001 returning id)
select is((select count(*) from changed),
  0::bigint, 'viewer_no_scope: update community A'
);
with changed as (update public.communities set actual_brothers = 1 where id = -910002 returning id)
select is((select count(*) from changed),
  0::bigint, 'viewer_no_scope: update community B'
);

-- A viewer cannot give themselves access.
select throws_ok(
  $$select public.grant_community_access('91000000-0000-0000-0000-000000000009', -910001)$$,
  'P0001', 'Solo admin, contributor y zone_leader pueden otorgar acceso',
  'Viewer cannot grant access'
);
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.grant_community_access('91000000-0000-0000-0000-000000000009', -910001)$$,
  'Admin grants community access'
);
-- Repeated grants are idempotent.
select public.grant_community_access('91000000-0000-0000-0000-000000000009', -910001);
select is(
  (select count(*) from public.user_community_access where user_id = '91000000-0000-0000-0000-000000000009' and community_id = -910001),
  1::bigint, 'Grant does not duplicate access'
);
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000009', true);
select results_eq(
  $$select id from public.communities where id in (-910001, -910002) order by id$$,
  ARRAY[-910001]::bigint[], 'Grant makes only the selected community visible'
);
select results_eq(
  $$select community_id from public.get_my_community_access() where community_id in (-910001, -910002) order by community_id$$,
  ARRAY[-910001]::bigint[], 'Account RPC returns granted access with valid SQL types'
);
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.revoke_community_access('91000000-0000-0000-0000-000000000009', -910001)$$,
  'Admin revokes community access'
);
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000009', true);
select is_empty(
  $$select id from public.communities where id in (-910001, -910002)$$,
  'Revocation immediately removes visibility'
);
reset role;
select * from finish();
rollback;
