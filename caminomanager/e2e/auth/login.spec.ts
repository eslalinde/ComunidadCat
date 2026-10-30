import { expect, test } from '@playwright/test';

// These flows exercise real pages without creating users or requiring seed data.
test.describe('Acceso sin sesión @smoke', () => {
  test('valida campos requeridos antes de enviar credenciales', async ({ page }) => {
    let requests = 0;
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/auth/v1/token') requests++;
    });
    await page.goto('/login');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByText('El correo es requerido', { exact: true })).toBeVisible();
    await expect(page.getByText('La contraseña es requerida', { exact: true })).toBeVisible();
    expect(requests).toBe(0);
  });

  test('muestra el rechazo de credenciales y permite reintentar', async ({ page }) => {
    // This is an API contract test, not proof that Supabase Auth is working.
    await page.route('**/auth/v1/token?grant_type=password', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON()).toMatchObject({
        email: 'invalid@test.local',
        password: 'Incorrecta123!',
      });
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'invalid_credentials', message: 'Invalid login credentials' }),
      });
    });
    await page.goto('/login');
    await page.getByLabel('Correo electrónico', { exact: true }).fill('invalid@test.local');
    await page.getByLabel('Contraseña', { exact: true }).fill('Incorrecta123!');
    await page.getByRole('button', { name: 'Ingresar', exact: true }).click();
    await expect(page.getByText('Credenciales inválidas. Verifica tu email y contraseña.')).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeEnabled();
  });

  for (const path of ['/comunidades', '/admin', '/reportes']) {
    test(`redirige ${path} al login sin sesión`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
      await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
      await expect(page.getByLabel('Correo electrónico', { exact: true })).toBeVisible();
    });
  }
});
