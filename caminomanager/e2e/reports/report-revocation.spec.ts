import { expect, test, type BrowserContext } from '@playwright/test';

// Exercise both browser workflows against the same in-memory Supabase HTTP fixture.
// Real login credentials, existing accounts and database rows are never used here.
test.use({ serviceWorkers: 'block' });

test('una revocación desde administración bloquea la descarga en el informe abierto', async ({ page, browser, baseURL }) => {
  const readerId = 'db3bad55-c835-41fc-9c08-da3cca610001';
  const adminId = 'db3bad55-c835-41fc-9c08-da3cca610002';
  const supabase = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321');
  const storageKey = `sb-${supabase.hostname.split('.')[0]}-auth-token`;
  let readerRole = 'zone_leader';

  async function prepareSession(context: BrowserContext, id: string) {
    const user = { id, email: `${id}@example.invalid`, aud: 'authenticated', role: 'authenticated',
      app_metadata: {}, user_metadata: {}, created_at: '2025-01-01T00:00:00Z' };
    const expires = Math.floor(Date.now() / 1000) + 3600;
    const session = { user, access_token: `fixture-${id}`, refresh_token: 'fixture-only', expires_at: expires, expires_in: 3600, token_type: 'bearer' };
    await context.addInitScript(({ key, value }) => {
      localStorage.setItem(key, JSON.stringify(value));
    }, { key: storageKey, value: session });
    await context.route(/\/(auth|rest)\/v1\//, async (route) => {
      const path = new URL(route.request().url()).pathname;
      const role = id === adminId ? 'admin' : readerRole;
      if (path === '/auth/v1/user') return route.fulfill({ json: user });
      if (path === '/rest/v1/profiles') return route.fulfill({ json: { full_name: 'Persona de prueba', feature_flags: {} } });
      if (path === '/rest/v1/rpc/get_user_role') return route.fulfill({ json: role });
      if (path === '/rest/v1/rpc/get_user_scope') return route.fulfill({ json: [{
        role, person_id: null, zone_id: role === 'zone_leader' ? 1 : null, community_id: null,
        granted_community_ids: [], has_community_grants: false, can_read_reports: role !== 'viewer',
      }] });
      if (path === '/rest/v1/rpc/get_admin_users_list' && id === adminId) return route.fulfill({ json: [{
        id: readerId, email: 'lector@example.invalid', full_name: 'Lector de prueba',
        role: readerRole, person_id: null, zone_id: 1, community_id: null,
      }] });
      if (path === '/rest/v1/rpc/set_user_role' && id === adminId) {
        expect(route.request().postDataJSON()).toMatchObject({ target_user_id: readerId, new_role: 'viewer' });
        readerRole = 'viewer';
        return route.fulfill({ json: null });
      }
      if (path === '/rest/v1/communities') return route.fulfill({ json: readerRole === 'viewer' ? [] : [{
        id: 1, parish_id: 1, number: '1', step_way_id: 1, parish: { name: 'Parroquia de prueba' },
      }] });
      if (path === '/rest/v1/step_ways') return route.fulfill({ json: [{ id: 1, name: 'Etapa de prueba', order_num: 1 }] });
      if (path === '/rest/v1/city_zones') return route.fulfill({ json: [{ id: 1, name: 'Zona de prueba' }] });
      return route.fulfill({ status: 404, json: { message: 'Solicitud fuera de la prueba' } });
    });
  }

  const admin = await browser.newContext({ baseURL, serviceWorkers: 'block' });
  try {
    await prepareSession(admin, adminId);
    const adminPage = await admin.newPage();
    await adminPage.goto('/admin');
    const selector = adminPage.getByRole('combobox').first();
    await expect(selector).toBeVisible();
    await prepareSession(page.context(), readerId);
    await page.goto('/reportes/estado-pasos');
    const exportButton = page.getByRole('button', { name: 'Exportar CSV' });
    await expect(page.getByRole('cell', { name: 'Parroquia de prueba' })).toBeVisible();
    const firstDownload = page.waitForEvent('download');
    await exportButton.click();
    expect((await firstDownload).suggestedFilename()).toBe('estado_pasos.csv');

    await selector.click();
    await adminPage.getByRole('option', { name: 'Visualizador' }).click();
    const revoked = adminPage.waitForResponse('**/rest/v1/rpc/set_user_role');
    await adminPage.getByRole('button', { name: 'Confirmar', exact: true }).click();
    expect((await revoked).ok()).toBe(true);

    const downloads: string[] = [];
    page.on('download', file => downloads.push(file.suggestedFilename()));
    await exportButton.click();
    await expect(page.getByRole('alert').filter({ hasText: 'permisos actuales' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Parroquia de prueba' })).toHaveCount(0);
    expect(downloads).toEqual([]);
  } finally {
    await admin.close();
  }
});
