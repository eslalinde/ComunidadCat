import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';
import { TEST_USERS } from '../fixtures/test-users';

// The report pages currently read tables directly. Exercise these RPCs through
// PostgREST as well, so a SQL return-type regression cannot pass the UI tests.
test.describe('RPC de estadísticas de reportes', () => {
  let client: SupabaseClient;

  test.beforeEach(async () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
    expect(url, 'Configura Supabase para ejecutar las pruebas de RPC').toBeTruthy();
    expect(key, 'Configura la clave pública de Supabase').toBeTruthy();
    client = createClient(url!, key!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.signInWithPassword({
      email: TEST_USERS.admin.email,
      password: TEST_USERS.admin.password,
    });
    expect(error).toBeNull();
  });

  test.afterEach(async () => {
    if (client) await client.auth.signOut({ scope: 'local' });
  });

  test('progresión devuelve etapas y el total de comunidades visible', async () => {
    const [stats, communities] = await Promise.all([
      client.rpc('get_community_progression_stats'),
      client.from('communities').select('id', { count: 'exact' }),
    ]);
    expect(stats.error).toBeNull();
    expect(communities.error).toBeNull();
    expect(stats.data.length).toBeGreaterThan(0);
    let total = 0;
    for (const row of stats.data) {
      expect(typeof row.step_way_name).toBe('string');
      expect(row.communities_count).toBeGreaterThan(0);
      expect(row.parishes_count).toBeGreaterThanOrEqual(0);
      if (row.avg_brothers !== null) expect(typeof row.avg_brothers).toBe('number');
      total += row.communities_count;
    }
    expect(total).toBe(communities.count);
  });

  test('equipos devuelve nombres, conteos y promedio por parroquia', async () => {
    const { data, error } = await client.rpc('get_team_stats_by_parish', {
      parish_id_param: 1,
    });
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
    for (const row of data) {
      expect(typeof row.team_type_name).toBe('string');
      expect(row.teams_count).toBeGreaterThan(0);
      expect(row.total_members).toBeGreaterThanOrEqual(0);
      expect(row.avg_members_per_team).toBeCloseTo(row.total_members / row.teams_count, 2);
    }
  });

  test('equipos devuelve una lista vacía para una parroquia inexistente', async () => {
    const { data, error } = await client.rpc('get_team_stats_by_parish', {
      parish_id_param: -1,
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  test('carga de presbíteros devuelve nombres y totales numéricos', async () => {
    const { data, error } = await client.rpc('get_priest_workload');
    expect(error).toBeNull();
    expect(data.length).toBeGreaterThan(0);
    for (const row of data) {
      expect(typeof row.priest_name).toBe('string');
      expect(typeof row.parish_name).toBe('string');
      expect(row.communities_count).toBeGreaterThanOrEqual(0);
      expect(row.total_brothers).toBeGreaterThanOrEqual(0);
      expect(typeof row.is_parish_priest).toBe('boolean');
    }
  });
});
