import { expect, test } from '../fixtures/auth.fixture';

test.describe('Navegación responsive — fase 6', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('marca la ruta actual y cierra el menú móvil al navegar', async ({ page }) => {
    const trigger = page.locator('[data-sidebar="trigger"]');
    const isMobile = (page.viewportSize()?.width ?? 0) < 768;

    await expect(trigger).toBeVisible();

    if (isMobile) {
      await trigger.click();
      const menu = page.getByRole('dialog', { name: 'Menú principal' });
      await expect(menu).toBeVisible();
      await expect(menu.getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );

      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();

      await trigger.click();
      await menu.getByRole('link', { name: 'Ciudades', exact: true }).click();
      await expect(page).toHaveURL(/\/ciudades$/);
      await expect(menu).toBeHidden();

      await trigger.click();
      await expect(menu.getByRole('link', { name: 'Ciudades', exact: true })).toHaveAttribute(
        'aria-current',
        'page',
      );
      return;
    }

    const sidebar = page.locator('[data-sidebar="sidebar"]').first();
    await expect(sidebar.getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await sidebar.getByRole('link', { name: 'Ciudades', exact: true }).click();
    await expect(page).toHaveURL(/\/ciudades$/);
    await expect(sidebar.getByRole('link', { name: 'Ciudades', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  test('expone migas de pan semánticas para rutas anidadas', async ({ page }) => {
    await page.goto('/reportes/equipos-catequistas');
    await page.waitForLoadState('networkidle');

    const breadcrumbs = page.getByRole('navigation', { name: 'Migas de pan' });
    const items = breadcrumbs.getByRole('listitem');

    await expect(breadcrumbs).toBeVisible();
    await expect(items).toHaveCount(3);
    await expect(breadcrumbs.getByRole('link', { name: 'Reportes', exact: true })).toHaveAttribute(
      'href',
      '/reportes',
    );
    await expect(breadcrumbs.getByText('Equipos de Catequistas', { exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
