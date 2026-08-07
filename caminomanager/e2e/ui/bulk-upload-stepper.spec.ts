import { expect, test } from '../fixtures/auth.fixture';

const validCsv = [
  'nombre,telefono,celular,email,carisma,genero,es_itinerante,nombre_conyuge',
  'Persona Stepper E2E,,,persona-stepper-e2e@example.com,Soltero/a,Masculino,No,',
].join('\n');

test.describe('Carga masiva — piloto Stepper ReUI', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/comunidades/detalle?id=1');
    await page.waitForLoadState('networkidle');
    await page.getByTitle('Carga masiva desde archivo CSV').click();
  });

  test('expone el progreso y permite volver sin guardar datos', async ({ page }) => {
    const dialog = page.getByRole('dialog', { name: /Carga Masiva/ });
    const progress = dialog.getByRole('navigation', {
      name: 'Progreso de carga masiva',
    });
    const steps = progress.getByRole('listitem');

    await expect(dialog).toBeVisible();
    await expect(steps).toHaveCount(4);
    await expect(steps.nth(0)).toHaveAttribute('aria-current', 'step');
    await expect(progress.getByText('Cargar Archivo', { exact: true })).toBeVisible();

    await dialog.getByLabel('Archivo CSV de hermanos').setInputFiles({
      name: 'hermanos-stepper-e2e.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(validCsv),
    });

    await expect(steps.nth(1)).toHaveAttribute('aria-current', 'step');
    await expect(dialog.getByText('Persona Stepper E2E', { exact: true })).toBeVisible();

    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    await expect(steps.nth(2)).toHaveAttribute('aria-current', 'step');

    await dialog.getByRole('button', { name: 'Siguiente' }).click();
    await expect(steps.nth(3)).toHaveAttribute('aria-current', 'step');
    await expect(dialog.getByRole('button', { name: 'Confirmar Carga' })).toBeVisible();

    await dialog.getByRole('button', { name: 'Anterior' }).click();
    await expect(steps.nth(2)).toHaveAttribute('aria-current', 'step');
    await expect(dialog.getByText('Persona Stepper E2E', { exact: true })).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });
});
