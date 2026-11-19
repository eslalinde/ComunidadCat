-- Integration contract: privilege escalation, PII exposure and anon privileges.
-- Run with: npm run test:integration (repository root).
begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

insert into public.cities (id, name) values (-920001, 'Security city');
insert into public.city_zones (id, name, city_id) values (-920001, 'Security zone', -920001);
insert into public.people (id, person_name) values (-920001, 'Security person'), (-920002, 'Linked person');

insert into auth.users (id, email, raw_user_meta_data)
select ('92000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid,
       'security-' || n || '@test.local', '{}'::jsonb
from generate_series(1, 4) n;

update public.profiles set role = 'admin' where id = '92000000-0000-0000-0000-000000000001';
update public.profiles set zone_id = -920001 where id = '92000000-0000-0000-0000-000000000002';
update public.profiles set person_id = -920002 where id = '92000000-0000-0000-0000-000000000004';
-- 92...03 stays as a fresh, unscoped signup (viewer).

-- anon has no access to application data or RPCs.
select is(
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')
     and has_table_privilege('anon', c.oid, 'select,insert,update,delete')),
  0::bigint, 'anon: no privileges on public tables or views'
);
select is(
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'execute')),
  0::bigint, 'anon: cannot execute public functions'
);
select ok(
  not has_function_privilege('authenticated', 'public.handle_new_user()', 'execute'),
  'authenticated: cannot call trigger functions directly'
);
select is(
  (select count(*) from pg_policies where schemaname = 'public' and roles && array['public', 'anon']::name[]),
  0::bigint, 'policies: none target public or anon'
);

set local role authenticated;

-- Fresh signup: cannot escalate and cannot read the people directory.
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$update public.profiles set role = 'admin' where id = '92000000-0000-0000-0000-000000000003'$$,
  '42501', null, 'viewer: cannot promote own role'
);
select throws_ok(
  $$update public.profiles set zone_id = -920001 where id = '92000000-0000-0000-0000-000000000003'$$,
  '42501', null, 'viewer: cannot assign own zone'
);
select throws_ok(
  $$update public.profiles set person_id = -920001 where id = '92000000-0000-0000-0000-000000000003'$$,
  '42501', null, 'viewer: cannot link own person'
);
with changed as (
  update public.profiles set full_name = 'Nuevo nombre'
  where id = '92000000-0000-0000-0000-000000000003' returning id
)
select is((select count(*) from changed), 1::bigint, 'viewer: can still edit own name');
select throws_ok(
  $$select public.set_user_role('92000000-0000-0000-0000-000000000003', 'admin')$$,
  null, null, 'viewer: set_user_role is admin-only'
);
select is(
  (select count(*) from public.people where id in (-920001, -920002)),
  0::bigint, 'unscoped viewer: people directory hidden'
);

-- Unscoped viewer linked to a person can see only that person.
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000004', true);
select results_eq(
  $$select id from public.people where id in (-920001, -920002)$$,
  ARRAY[-920002]::bigint[], 'linked viewer: sees own person only'
);

-- Scoped viewer keeps directory access.
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*) from public.people where id in (-920001, -920002)),
  2::bigint, 'zone viewer: people directory visible'
);

-- Admin can still manage roles through the RPC.
select set_config('request.jwt.claim.sub', '92000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.set_user_role('92000000-0000-0000-0000-000000000003', 'zone_leader', new_zone_id => -920001)$$,
  'admin: set_user_role works'
);
select is(
  (select role::text from public.profiles where id = '92000000-0000-0000-0000-000000000003'),
  'zone_leader', 'admin: role change persisted'
);

select * from finish();
rollback;
