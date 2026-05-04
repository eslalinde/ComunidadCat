import { test, expect } from '../fixtures/auth.fixture';
import { takeRoleScreenshot } from '../helpers/screenshots';

// La diferencia clave entre Administrador y Contribuidor es la gestión de
// permisos: el admin puede crear usuarios y cambiar roles, el contribuidor no.

test.describe('Gestión de permisos — Admin vs Contribuidor', () => {
  test('Administrador ve la UI de gestión de roles y permisos', async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');

    // Heading and create-user CTA.
    await expect(page.getByRole('heading', { name: /administración de usuarios/i }))
      .toBeVisible();
    await expect(page.getByRole('button', { name: /crear usuario/i })).toBeVisible();

    // Role selector (a SelectTrigger) must be present for at least one user row.
    // En desktop el listado vive en una <table>; en mobile (<768px) se renderiza
    // como una lista de tarjetas (<ul>). Cubrimos ambos sin acoplar al layout.
    const roleSelectors = page.locator(
      'table [role="combobox"], ul [role="combobox"]'
    );
    await expect(roleSelectors.first()).toBeVisible({ timeout: 10_000 });
    expect(await roleSelectors.count()).toBeGreaterThan(0);

    await takeRoleScreenshot(page, 'admin', 'perms-admin-can-manage', {
      testCaseId: 'TC-PERMS-ADMIN-CAN-MANAGE',
    });
  });

  test('Contribuidor NO ve gestión de permisos', async ({ page, loginAs }) => {
    await loginAs('contributor');

    // Sidebar should not show "Administración".
    await page.waitForLoadState('networkidle');
    const viewport = page.viewportSize();
    if (viewport && viewport.width < 768) {
      const menuButton = page.locator('[data-sidebar="trigger"]');
      if (await menuButton.isVisible()) {
        await menuButton.click();
        await page.waitForTimeout(300);
      }
    }
    const sidebar = page.locator('[data-sidebar="sidebar"]');
    expect(await sidebar.getByText('Administración', { exact: true }).count()).toBe(0);

    // Direct navigation to /admin must redirect away.
    await page.goto('/admin');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin'), { timeout: 10_000 });
    expect(page.url()).not.toContain('/admin');

    // And the create-user / role-management UI must not be reachable.
    await expect(page.getByRole('button', { name: /crear usuario/i })).toHaveCount(0);

    await takeRoleScreenshot(page, 'contributor', 'perms-contributor-blocked', {
      testCaseId: 'TC-PERMS-CONTRIBUTOR-CANNOT',
    });
  });
});
