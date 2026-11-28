begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(37);

insert into cities(id, name) values (-950001, 'Reports');
insert into city_zones(id, city_id, name) values
  (-950001, -950001, 'Zone A'), (-950002, -950001, 'Zone B');
insert into parishes(id, city_id, zone_id, name) values
  (-950001, -950001, -950001, 'Parish A'), (-950002, -950001, -950002, 'Parish B');
insert into communities(id, parish_id, number) values
  (-950001, -950001, '1'), (-950002, -950002, '1');
insert into community_step_log(id, community_id, notes) values
  (-950001, -950001, 'Note A'), (-950002, -950002, 'Note B');
insert into teams(id, team_type_id, community_id, name) values
  (-950001, 3, -950001, 'Team A'), (-950002, 3, -950002, 'Team B');
insert into people(id, person_name) values (-950001, 'Priest A'), (-950002, 'Priest B');
insert into priests(id, person_id, parish_id) values
  (-950001, -950001, -950001), (-950002, -950002, -950002);
insert into auth.users(id, email, raw_user_meta_data)
select ('95000000-0000-0000-0000-00000000000' || n)::uuid, 'report-' || n || '@example.invalid', '{}'
from generate_series(1, 6) n;
update profiles set role = 'zone_leader', zone_id = -950001 where id = '95000000-0000-0000-0000-000000000001';
update profiles set role = 'community_responsible', community_id = -950001 where id = '95000000-0000-0000-0000-000000000002';
update profiles set role = 'admin' where id = '95000000-0000-0000-0000-000000000004';
update profiles set role = 'contributor' where id = '95000000-0000-0000-0000-000000000005';
update profiles set role = 'zone_contributor', zone_id = -950001 where id = '95000000-0000-0000-0000-000000000006';
insert into user_community_access(user_id, community_id, granted_by) values
  ('95000000-0000-0000-0000-000000000003', -950001, '95000000-0000-0000-0000-000000000004'),
  ('95000000-0000-0000-0000-000000000003', -950002, '95000000-0000-0000-0000-000000000004');

set local role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000001',true);
select ok(can_read_reports(), 'Zone leader can generate reports');
select is((select s.can_read_reports from get_user_scope() s), true, 'Scope confirms report access for a zone leader');
select results_eq($$select id from community_step_log where id in (-950001, -950002)$$,
  array[-950001]::bigint[], 'Leader sees own zone step logs');
select results_eq($$select team_id from view_catechist_teams where team_id in (-950001, -950002)$$,
  array[-950001]::bigint[], 'Team report retains zone scope');
select results_eq($$select parish_id from view_communities_by_parish where parish_id in (-950001, -950002)$$,
  array[-950001]::bigint[], 'Parish report retains zone scope');
select results_eq($$select priest_id from view_priests_report where priest_id in (-950001, -950002)$$,
  array[-950001]::bigint[], 'Priest report retains zone scope');
select is((select teams_count from get_team_stats_by_parish(-950001)), 1::bigint, 'Own parish statistics available');
select is_empty($$select * from get_team_stats_by_parish(-950002)$$, 'Foreign parish team statistics hidden');
select is((select sum(communities_count)::bigint from get_community_progression_stats()), 1::bigint,
  'Progression statistics count only visible communities');
select results_eq($$select priest_name from get_priest_workload() where priest_name in ('Priest A','Priest B')$$,
  array['Priest A']::text[], 'Workload statistics retain zone scope');

select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000002',true);
select is(can_read_reports(), false, 'Community responsible cannot generate reports');
select is_empty($$select id from community_step_log where community_id = -950001$$,
  'Community responsible cannot read their own community step notes');
select is_empty($$select * from view_catechist_teams$$, 'Restricted role cannot obtain team report');
select is_empty($$select * from view_communities_by_parish$$, 'Restricted role cannot obtain parish report');
select is_empty($$select * from view_priests_report$$, 'Restricted role cannot obtain priest report');
select throws_ok($$select * from get_team_stats_by_parish(-950001)$$, '42501', null, 'Team statistics RPC enforces report role');
select throws_ok($$select * from get_community_progression_stats()$$, '42501', null, 'Progression RPC enforces report role');
select throws_ok($$select * from get_priest_workload()$$, '42501', null, 'Workload RPC enforces report role');
select is((select granted_community_ids from get_user_scope()), '{}'::bigint[], 'An account sees only its own explicit grants');

select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000003',true);
select is(can_read_reports(), false, 'Scoped viewer still cannot generate reports');
select is((select s.can_read_reports from get_user_scope() s), false, 'Scope denies report access for a scoped viewer');
select is((select granted_community_ids from get_user_scope()), array[-950002, -950001]::bigint[],
  'Scope returns ordered explicit grants');
select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000004',true);
select ok(can_read_reports(), 'Admin can generate reports');
select public.revoke_community_access('95000000-0000-0000-0000-000000000003', -950002);
select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000003',true);
select results_eq($$select id from community_step_log where id in (-950001,-950002)$$, array[-950001]::bigint[],
  'Viewer can read explicitly granted step notes and loses revoked notes');
select is((select granted_community_ids from get_user_scope()), array[-950001]::bigint[],
  'Partial revocation changes the scope returned in the same session');
select ok((select has_community_grants from get_user_scope()), 'Grant flag retains its original meaning');
select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000005',true);
select ok(can_read_reports(), 'Global contributor can generate reports');
select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000006',true);
select is(can_read_reports(), false, 'Zone contributor cannot generate reports');
select results_eq($$select id from community_step_log where id in (-950001,-950002)$$, array[-950001]::bigint[],
  'Zone contributor retains scoped access to individual step notes');
select ok(not has_function_privilege('anon', 'public.can_read_reports()', 'execute')
  and not has_function_privilege('anon', 'public.get_user_scope()', 'execute'), 'Authorization RPCs exclude anonymous callers');
select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000007',true);
select is(can_read_reports(), false, 'Authenticated identity without a profile is explicitly denied');
select throws_ok($$select * from get_team_stats_by_parish(-950001)$$, '42501', null, 'No profile cannot read team statistics');
select throws_ok($$select * from get_community_progression_stats()$$, '42501', null, 'No profile cannot read progression statistics');
select throws_ok($$select * from get_priest_workload()$$, '42501', null, 'No profile cannot read workload statistics');

-- Exercise all RPC guards against an indeterminate decision, even for an admin.
-- The enclosing test transaction rolls the injected dependency back.
reset role;
create or replace function public.can_read_reports() returns boolean
language sql stable security invoker set search_path = '' as $$select null::boolean$$;
set local role authenticated;
select set_config('request.jwt.claim.sub','95000000-0000-0000-0000-000000000004',true);
select throws_ok($$select * from get_team_stats_by_parish(-950001)$$, '42501', null, 'Team RPC requires a positive decision');
select throws_ok($$select * from get_community_progression_stats()$$, '42501', null, 'Progression RPC requires a positive decision');
select throws_ok($$select * from get_priest_workload()$$, '42501', null, 'Workload RPC requires a positive decision');
select * from finish();
rollback;
