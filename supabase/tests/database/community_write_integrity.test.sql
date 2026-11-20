begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(28);

insert into cities(id,name) values (-940001,'Write integrity');
insert into city_zones(id,name,city_id) values (-940001,'A',-940001),(-940002,'B',-940001);
insert into parishes(id,name,city_id,zone_id) values
  (-940001,'A',-940001,-940001),(-940002,'B',-940001,-940002);
insert into communities(id,number,parish_id) values (-940001,'1',-940001),(-940002,'1',-940002);
insert into teams(id,name,community_id,team_type_id) values
  (-940001,'A',-940001,4),(-940002,'B',-940002,4),(-940003,'National',null,1);
insert into people(id,person_name) values (-940001,'Existing member');
insert into brothers(person_id,community_id) values (-940001,-940001);
insert into auth.users(id,email,raw_user_meta_data)
select ('94000000-0000-0000-0000-00000000000' || n)::uuid, 'write-' || n || '@example.invalid', '{}'
from generate_series(1,3) n;
update profiles set role='zone_leader',zone_id=-940001 where id='94000000-0000-0000-0000-000000000001';
update profiles set role='community_responsible',community_id=-940001 where id='94000000-0000-0000-0000-000000000002';
update profiles set role='admin' where id='94000000-0000-0000-0000-000000000003';

set local role authenticated;
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
select lives_ok($$insert into belongs(id,person_id,team_id,community_id)
  values(-940001,-940001,-940001,-940001)$$,'Zone leader adds member to own team');
select throws_ok($$insert into belongs(person_id,team_id,community_id) values(-940001,-940002,-940001)$$,
  '42501',null,'Cannot claim a foreign team belongs to own community');
select throws_ok($$update belongs set team_id=-940003 where id=-940001$$,
  '42501',null,'Changing the team cannot give a zone leader authority over the national roster');
select throws_ok($$update belongs set team_id=-940002, community_id=-940002 where id=-940001$$,
  '42501',null,'A consistent foreign destination still requires write authority');
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000003',true);
select lives_ok($$insert into belongs(person_id,team_id,community_id) values(-940001,-940003,null)$$,
  'Global manager can add national team members');

insert into community_visits(id,community_id,description,created_by) values
  (-940001,-940001,'Visit','94000000-0000-0000-0000-000000000002');
insert into community_inventory(id,community_id,custom_name,created_by) values
  (-940001,-940001,'Item','94000000-0000-0000-0000-000000000002');
select is((select created_by from community_visits where id=-940001),auth.uid(),'Database assigns visit author');
select is((select created_by from community_inventory where id=-940001),auth.uid(),'Database assigns inventory author');
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000002',true);
select throws_ok($$update community_visits set created_by=auth.uid() where id=-940001$$,
  '42501',null,'Visit author cannot be replaced');
select throws_ok($$update community_inventory set created_by=auth.uid() where id=-940001$$,
  '42501',null,'Inventory author cannot be replaced');
with changed as (update community_inventory set quantity=2 where id=-940001 returning id)
select is((select count(*) from changed),1::bigint,'Other editable fields remain writable');
with removed as (delete from community_inventory where id=-940001 returning id)
select is((select count(*) from removed),0::bigint,'Editor cannot delete another user’s inventory');
with removed as (delete from community_visits where id=-940001 returning id)
select is((select count(*) from removed),0::bigint,'Editor cannot delete another user’s visit');

select throws_ok($$select import_community_brothers(-940001,'94000000-0000-0000-0001-000000000005','[]')$$,
  'P0001','La carga debe incluir al menos un hermano','Empty imports cannot update the census');

-- RLS permits these first inserts but denies the team assignment at the end.
select throws_ok($$select import_community_brothers(-940001,'94000000-0000-0000-0001-000000000001',
  '[{"person_name":"Rollback A"},{"person_name":"Rollback B","responsable":true}]')$$,
  '42501',null,'Late failure rejects the complete import');
reset role;
select is_empty($$select id from people where person_name in ('Rollback A','Rollback B')$$,'Failed import leaves no people');
select is((select count(*) from brothers where community_id=-940001),1::bigint,'Failed import leaves no memberships');
select is_empty($$select request_id from bulk_import_private.receipts where community_id=-940001$$,'Rollback leaves no successful receipt');
set local role authenticated;
select throws_ok($$select import_community_brothers(-940002,'94000000-0000-0000-0001-000000000002',
  '[{"person_name":"Outside"}]')$$,'42501',null,'Import requires current scope');
select is(import_community_brothers(-940001,'94000000-0000-0000-0001-000000000001',
  '[{"person_name":"CSV spouse A","spouse_position":2},{"person_name":"CSV spouse B","spouse_position":1}]'),
  '{"peopleCreated":2,"brothersLinked":2,"marriagesLinked":1,"responsablesAssigned":0}'::jsonb,
  'A responsible can import spouses and retry a previously rolled-back request');
select is((select count(*) from people p join people s on s.id=p.spouse_id and s.spouse_id=p.id
  where p.person_name in ('CSV spouse A','CSV spouse B')),2::bigint,'Both spouse links are persisted');
select is((select actual_brothers from communities where id=-940001),3::smallint,'Stored total includes existing members');
select is(import_community_brothers(-940001,'94000000-0000-0000-0001-000000000001',
  '[{"person_name":"CSV spouse A","spouse_position":2},{"person_name":"CSV spouse B","spouse_position":1}]')->>'peopleCreated',
  '2','Repeated operation returns its committed receipt');
select is((select count(*) from brothers where community_id=-940001),3::bigint,'Retry creates no new memberships');
select set_config('request.jwt.claim.sub','94000000-0000-0000-0000-000000000001',true);
select is(import_community_brothers(-940001,'94000000-0000-0000-0001-000000000003',
  '[{"person_name":"CSV team member","responsable":true}]')->>'responsablesAssigned','1','Authorized team assignment commits');
select is((select count(*) from belongs b join people p on p.id=b.person_id where b.team_id=-940001
  and b.is_responsible_for_the_team and p.person_name='CSV team member'),1::bigint,'Team leader flag persists');
select is(import_community_brothers(-940001,'94000000-0000-0000-0001-000000000004',
  '[{"person_name":"Second CSV member","responsable":true}]')->>'responsablesAssigned','1','Additional team member assigned');
select is((select count(*) from belongs where team_id=-940001 and is_responsible_for_the_team),1::bigint,
  'Additional imports preserve the single existing team leader');
select ok(not has_function_privilege('anon','public.import_community_brothers(bigint,uuid,jsonb)','execute'),
  'Anonymous role cannot call the import RPC');
select * from finish();
rollback;
