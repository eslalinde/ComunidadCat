// Local-only, additive fixture for real product screenshots. Never reads cloud env vars.
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
if (args.length !== 0 && (args.length !== 2 || args[0] !== '--port'
    || !/^\d+$/.test(args[1]) || Number(args[1]) < 1 || Number(args[1]) > 65535)) {
  console.error('Uso: node scripts/seed-landing-demo.mjs [--port PUERTO_LOCAL]');
  process.exit(1);
}
// Only the port is configurable for isolated local validation. Never accept a URL
// or inherit PGHOST, PGDATABASE, DATABASE_URL or cloud credentials.
const client = new pg.Client({
  host: '127.0.0.1', port: Number(args[1] ?? 54322),
  user: 'postgres', password: 'postgres', database: 'postgres',
  ssl: false, connectionTimeoutMillis: 5000,
});
const base = -1030000;
const email = 'landing-demo@example.test';
const password = 'LocalDemoOnly-2026!';
let inTransaction = false;
try {
  await client.connect();
  await client.query('BEGIN');
  inTransaction = true;
  const occupied = await client.query('SELECT id FROM public.communities WHERE id = $1', [base]);
  if (occupied.rowCount) throw new Error('La comunidad demo ya existe. Reutiliza los datos existentes; no se modificó ningún dato.');
  const catalogs = await client.query(`SELECT
    EXISTS (SELECT 1 FROM public.countries WHERE id=1 AND code='CO')
    AND EXISTS (SELECT 1 FROM public.states WHERE id=2 AND country_id=1 AND name='Antioquia')
    AND EXISTS (SELECT 1 FROM public.team_types WHERE id=3 AND name='Catequistas')
    AND EXISTS (SELECT 1 FROM public.team_types WHERE id=4 AND name='Responsables')
    AND EXISTS (SELECT 1 FROM public.step_ways WHERE id=1 AND name='Precatecumenado')
    AND EXISTS (SELECT 1 FROM public.step_ways WHERE id=2 AND name='1º Escrutinio Bautismal')
    AS ready`);
  if (!catalogs.rows[0].ready) {
    throw new Error('Faltan los catálogos esperados de supabase/seed.sql. Usa una base local preparada con las migraciones y el seed del repositorio.');
  }
  await client.query('INSERT INTO public.cities (id,name,country_id,state_id) VALUES ($1,$2,1,2)', [base, 'Villa Esperanza']);
  await client.query('INSERT INTO public.city_zones (id,name,city_id) VALUES ($1,$2,$1)', [base, 'Zona del Encuentro']);
  await client.query('INSERT INTO public.dioceses (id,name,type) VALUES ($1,$2,$3)', [base, 'Villa Esperanza', 'diocesis']);
  await client.query('INSERT INTO public.parishes (id,name,city_id,zone_id,diocese_id) VALUES ($1,$2,$1,$1,$1)', [base, 'Santa María del Encuentro']);
  await client.query(`INSERT INTO public.communities
    (id,number,born_date,parish_id,born_brothers,actual_brothers,step_way_id,last_step_way_date)
    VALUES ($1,'1','2012-06-17',$1,16,12,2,'2025-03-16')`, [base]);

  const people = [
    ['María López', 1, 2], ['José Martínez', 1, 1],
    ['Elena Vargas', 1, 2], ['Andrés Molina', 1, 1],
    ['Clara Méndez', 1, 2], ['Miguel Santos', 1, 1],
    ['Isabel Castro', 1, 2], ['Tomás Herrera', 1, 1],
    ['Ana García', 2, 2], ['Diego Ruiz', 2, 1],
    ['Lucía Torres', 2, 2], ['Pablo Ríos', 3, 1],
  ];
  for (const [index, [name, type, gender]] of people.entries()) {
    const personId = base - index - 1;
    // No telephone numbers, real email addresses, or personal addresses in screenshots.
    await client.query('INSERT INTO public.people (id,person_name,person_type_id,gender_id) VALUES ($1,$2,$3,$4)', [personId, name, type, gender]);
    await client.query('INSERT INTO public.brothers (id,person_id,community_id) VALUES ($1,$1,$2)', [personId, base]);
  }
  for (let i = 0; i < 8; i += 2) {
    await client.query('UPDATE public.people SET spouse_id=$2 WHERE id=$1', [base-i-1, base-i-2]);
    await client.query('UPDATE public.people SET spouse_id=$2 WHERE id=$1', [base-i-2, base-i-1]);
  }
  await client.query(`INSERT INTO public.teams (id,name,team_type_id,community_id) VALUES
    ($1,'Responsables de la Comunidad 1',4,$1), ($2,'Equipo Santa María',3,$1)`, [base, base-1]);
  await client.query('UPDATE public.communities SET cathechist_team_id=$2 WHERE id=$1', [base, base-1]);
  await client.query('INSERT INTO public.parish_teams (id,parish_id,team_id) VALUES ($1,$1,$2)', [base, base-1]);
  for (const [i, personIndex] of [0,1,8].entries()) {
    await client.query(`INSERT INTO public.belongs (id,person_id,community_id,team_id,is_responsible_for_the_team)
      VALUES ($1,$2,$3,$3,$4)`, [base-i, base-personIndex-1, base, i<2]);
  }
  for (const [i, personIndex] of [2,3,11].entries()) {
    await client.query(`INSERT INTO public.belongs (id,person_id,community_id,team_id,is_responsible_for_the_team)
      VALUES ($1,$2,$3,$4,$5)`, [base-i-3, base-personIndex-1, base, base-1, i<2]);
  }
  await client.query('INSERT INTO public.priests (id,person_id,is_parish_priest,parish_id) VALUES ($1,$2,true,$1)', [base,base-12]);
  await client.query(`INSERT INTO public.community_step_log (id,community_id,step_way_id,date_of_step,principal_catechist_name,outcome,notes)
    VALUES ($1,$1,1,'2012-06-17','Elena Vargas y Andrés Molina',true,'Inicio de la comunidad.'),
    ($2,$1,2,'2025-03-16','Elena Vargas y Andrés Molina',true,'Convivencia de primer escrutinio.')`, [base,base-1]);

  const userId = randomUUID();
  // Same local auth fixture mechanism as seed-test-users.ts. No production accounts.
  await client.query(`INSERT INTO auth.users (
    id,instance_id,email,encrypted_password,email_confirmed_at,role,aud,
    raw_user_meta_data,raw_app_meta_data,created_at,updated_at,
    confirmation_token,recovery_token,email_change,email_change_token_new,email_change_token_current,
    phone_change,phone_change_token,is_sso_user,is_anonymous
  ) VALUES ($1,'00000000-0000-0000-0000-000000000000',$2,crypt($3,gen_salt('bf')),now(),
    'authenticated','authenticated','{"full_name":"María López"}',
    '{"provider":"email","providers":["email"]}',now(),now(),'','','','','','','',false,false)`, [userId,email,password]);
  await client.query(`INSERT INTO auth.identities (id,user_id,identity_data,provider,provider_id,last_sign_in_at,created_at,updated_at)
    VALUES (gen_random_uuid(),$1::uuid,jsonb_build_object('sub',$1::text,'email',$2::text,'email_verified',true,'phone_verified',false),
    'email',$2,now(),now(),now())`, [userId,email]);
  const profile = await client.query(`UPDATE public.profiles SET full_name='María López', username='landing-demo',
    role='zone_leader', zone_id=$2 WHERE id=$1`, [userId,base]);
  if (profile.rowCount !== 1) throw new Error('No se creó el perfil del usuario demo.');
  const result = await client.query(`SELECT c.number, c.actual_brothers,
    (SELECT count(*) FROM public.brothers b WHERE b.community_id=c.id)::int AS members,
    (SELECT count(*) FROM public.teams t WHERE t.community_id=c.id)::int AS teams
    FROM public.communities c WHERE c.id=$1`, [base]);
  if (result.rows[0].members !== 12 || result.rows[0].teams !== 2) throw new Error('Los datos demo están incompletos.');
  await client.query('COMMIT');
  inTransaction = false;
  console.log(JSON.stringify({ communityId:base, fixture:result.rows[0], localOnly:true }));
} catch (error) {
  if (inTransaction) await client.query('ROLLBACK');
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
