import { _electron as electron, expect, test } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TEST_USERS } from '../fixtures/test-users';

test('carga el renderer estático y los controles ReUI dentro de Electron', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'comunidadcat-electron-'));
  const electronApp = await electron.launch({
    args: ['.'],
    cwd: process.cwd(),
    env: {
      ...process.env,
      ELECTRON_SMOKE_TEST: '1',
      ELECTRON_SMOKE_USER_DATA: userDataDir,
    },
  });

  try {
    const page = await electronApp.firstWindow();
    await page.waitForLoadState('domcontentloaded');

    await expect
      .poll(() => page.evaluate(() => typeof window.electronAPI?.windowIsMaximized))
      .toBe('function');

    const maximize = page.getByRole('button', { name: 'Maximizar' });
    await expect(maximize).toBeVisible();
    await maximize.click();
    await expect(page.getByRole('button', { name: 'Restaurar' })).toBeVisible();
    await page.getByRole('button', { name: 'Restaurar' }).click();
    await expect(maximize).toBeVisible();

    const admin = TEST_USERS.admin;
    await page.getByLabel(/correo/i).fill(admin.email);
    await page.getByLabel(/contraseña/i).fill(admin.password);
    await page.getByRole('button', { name: /ingresar/i }).click();
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 20_000,
    });

    const sidebar = page.locator('[data-sidebar="sidebar"]').first();
    await expect(sidebar.getByRole('link', { name: 'Inicio', exact: true })).toHaveAttribute(
      'aria-current',
      'page',
    );
    await sidebar.getByRole('link', { name: 'Ciudades', exact: true }).click();
    await expect(page).toHaveURL(/\/ciudades$/);
    await expect(
      page.getByRole('navigation', { name: 'Migas de pan' }).getByText('Ciudades'),
    ).toHaveAttribute('aria-current', 'page');

    await page.getByRole('button', { name: /Agregar ciudad/i }).click();
    await expect(page.getByRole('combobox', { name: /País/ })).toBeVisible();
    await page.screenshot({
      path: 'e2e/screenshots/electron-cities-smoke.png',
    });
    await page.getByRole('button', { name: 'Cancelar' }).click();

    const deleteTrigger = page.getByRole('button', { name: /Eliminar / }).first();
    await deleteTrigger.click();
    const alertDialog = page.getByRole('alertdialog');
    await expect(alertDialog).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(alertDialog).toBeHidden();

    await sidebar.getByRole('link', { name: 'Reportes', exact: true }).click();
    await page.getByRole('link', { name: /Equipos de Catequistas/ }).click();
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByText(/^Página 1 de \d+ · \d+ registros$/)).toBeVisible();
    await page.screenshot({
      path: 'e2e/screenshots/electron-datagrid-smoke.png',
      fullPage: true,
    });

    await sidebar.getByRole('link', { name: 'Comunidades', exact: true }).click();
    await page.getByRole('table').locator('tbody tr').first().click();
    await page.getByTitle('Carga masiva desde archivo CSV').click();
    const stepper = page.getByRole('navigation', { name: 'Progreso de carga masiva' });
    await expect(stepper.getByRole('listitem')).toHaveCount(4);
    await expect(stepper.getByRole('listitem').first()).toHaveAttribute(
      'aria-current',
      'step',
    );
    await page.screenshot({
      path: 'e2e/screenshots/electron-stepper-smoke.png',
    });
    await page.keyboard.press('Escape');
  } finally {
    await electronApp.close();
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
