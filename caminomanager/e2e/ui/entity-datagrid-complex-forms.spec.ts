import { expect, test } from '../fixtures/auth.fixture';

test.describe('EntityTable con DataGrid', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/paises');
    await page.waitForLoadState('networkidle');
  });

  test('ordena desde el encabezado y conserva acciones accesibles', async ({
    page,
  }, testInfo) => {
    const grid = page.locator('[data-slot="data-grid"]');

    if (testInfo.project.name === 'chromium-mobile') {
      await expect(grid).toHaveCount(0);
      await expect(page.getByRole('button', { name: /Editar / }).first()).toBeVisible();
      return;
    }

    await expect(grid).toBeVisible();
    const nameHeader = grid.getByRole('columnheader', { name: /Nombre/ });
    await expect(nameHeader).toHaveAttribute('aria-sort', 'ascending');
    await nameHeader.getByRole('button').focus();
    await page.keyboard.press('Enter');
    await expect(nameHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(grid.getByRole('button', { name: /Editar / }).first()).toBeVisible();
    await expect(grid.getByRole('button', { name: /Eliminar / }).first()).toBeVisible();
  });
});

test.describe('Formularios complejos con ReUI', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('admin');
  });

  test('Persona muestra secciones y ubicación dependiente', async ({ page }) => {
    await page.goto('/personas');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Agregar persona/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText('Datos personales')).toBeVisible();
    await expect(dialog.getByText('Vocación y vínculos')).toBeVisible();
    await expect(
      dialog.getByRole('combobox', { name: /País donde se encuentra/ }),
    ).toHaveCount(0);

    await dialog.getByRole('checkbox', { name: 'Itinerante' }).click();
    await expect(dialog.getByText('Ubicación actual')).toBeVisible();
    await expect(
      dialog.getByRole('combobox', { name: /País donde se encuentra/ }),
    ).toBeVisible();
    await expect(
      dialog.getByRole('combobox', { name: /Ciudad donde se encuentra/ }),
    ).toBeDisabled();

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
    await expect(dialog).toBeHidden();
  });

  test('Comunidad usa búsqueda para sus relaciones principales', async ({ page }) => {
    await page.goto('/comunidades');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Agregar comunidad/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveClass(/sm:max-w-3xl/);
    await expect(dialog.getByText('Identificación')).toHaveCount(0);
    await expect(dialog.getByText('Progreso en el Camino')).toHaveCount(0);
    await expect(dialog.getByText('Acompañamiento')).toHaveCount(0);
    const parish = dialog.getByRole('combobox', { name: /Parroquia/ });
    await expect(parish).toBeVisible();
    await expect(parish.locator('xpath=ancestor::*[@data-slot="form-item"]')).toHaveClass(
      /sm:col-span-2/,
    );
    await expect(dialog.getByRole('combobox', { name: /Etapa Actual/ })).toBeVisible();
    const catechistTeam = dialog.getByRole('combobox', {
      name: /Equipo de Catequistas/,
    });
    await expect(catechistTeam).toBeVisible();
    await expect(
      catechistTeam.locator('xpath=ancestor::*[@data-slot="form-item"]'),
    ).toHaveClass(/sm:col-span-2/);

    const footer = dialog.getByRole('button', { name: 'Guardar' }).locator('..');
    await expect(footer).toHaveClass(/col-span-full/);
    if ((page.viewportSize()?.width ?? 0) >= 640) {
      await expect(footer).toHaveCSS('justify-content', 'flex-end');
    }

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('Parroquia usa búsqueda y organiza la ubicación', async ({ page }) => {
    await page.goto('/parroquias');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /Agregar parroquia/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog).toHaveClass(/sm:max-w-3xl/);
    await expect(dialog.getByText('Información parroquial')).toBeVisible();
    await expect(dialog.getByText('Ubicación')).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: /Diócesis/ })).toBeVisible();
    await expect(dialog.getByRole('combobox', { name: /Ciudad/ })).toBeVisible();

    await dialog.getByRole('button', { name: 'Cancelar' }).click();
  });
});
