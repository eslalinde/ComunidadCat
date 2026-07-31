import type { Page } from '@playwright/test';
import { expect, test } from '../fixtures/auth.fixture';

async function selectLocation(page: Page) {
  const country = page.getByRole('combobox', { name: /País/ });
  const state = page.getByRole('combobox', { name: /Departamento/ });

  await country.fill('Col');
  await page.getByRole('option', { name: /Colombia/ }).click();
  await expect(state).toBeEnabled();
  await state.fill('Anti');
  await page.getByRole('option', { name: /Antioquia/ }).click();
}

async function cleanupCity(page: Page, names: string[]) {
  await page.goto('/ciudades');
  await page.waitForLoadState('networkidle');

  const search = page.getByPlaceholder(/Buscar ciudad/i);

  for (const name of names) {
    await search.fill(name);
    const deleteButton = page.getByRole('button', {
      name: `Eliminar ${name}`,
      exact: true,
    });

    if (!(await deleteButton.isVisible({ timeout: 2_000 }).catch(() => false))) {
      continue;
    }

    await deleteButton.click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByLabel(/Escribe eliminar para confirmar/i).fill('eliminar');
    await dialog.getByRole('button', { name: 'Eliminar', exact: true }).click();
    await expect(dialog).toBeHidden();
    return;
  }
}

test.describe('Ciudades — piloto ReUI', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/ciudades');
    await page.waitForLoadState('networkidle');
  });

  test('usa Autocomplete para País y Departamento dependiente', async ({ page }) => {
    await page.getByRole('button', { name: /Agregar ciudad/i }).click();

    const country = page.getByRole('combobox', { name: /País/ });
    const state = page.getByRole('combobox', { name: /Departamento/ });
    await expect(country).toBeVisible();
    await expect(state).toBeDisabled();

    await country.fill('Col');
    await page.getByRole('option', { name: /Colombia/ }).click();
    await expect(country).toHaveValue('Colombia');
    await expect(state).toBeEnabled();

    await state.fill('Anti');
    await page.getByRole('option', { name: /Antioquia/ }).click();
    await expect(state).toHaveValue('Antioquia');

    await page.getByRole('button', { name: 'Cancelar' }).click();
  });

  test('usa AlertDialog y conserva una salida segura', async ({ page }) => {
    const deleteTrigger = page.getByRole('button', { name: /Eliminar / }).first();
    await deleteTrigger.click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();

    const dialogBox = await dialog.boundingBox();
    const viewport = page.viewportSize();
    expect(dialogBox).not.toBeNull();
    expect(viewport).not.toBeNull();
    expect(
      Math.abs(dialogBox!.x + dialogBox!.width / 2 - viewport!.width / 2),
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(dialogBox!.y + dialogBox!.height / 2 - viewport!.height / 2),
    ).toBeLessThanOrEqual(1);

    await expect(dialog.getByRole('button', { name: 'Cancelar' })).toBeFocused();
    await expect(dialog.getByRole('button', { name: 'Eliminar' })).toBeDisabled();

    await dialog.getByLabel(/Escribe eliminar para confirmar/i).fill('eliminar');
    await expect(dialog.getByRole('button', { name: 'Eliminar' })).toBeEnabled();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(deleteTrigger).toBeFocused();
  });

  test('crea, edita y elimina una ciudad persistida', async ({ page }, testInfo) => {
    test.slow();

    const suffix = `${testInfo.project.name}-${Date.now()}`;
    const createdName = `E2E Ciudad ${suffix}`;
    const editedName = `${createdName} editada`;
    let cleanupRequired = false;

    try {
      await page.getByRole('button', { name: /Agregar ciudad/i }).click();
      await page.getByLabel(/^Nombre/).fill(createdName);
      await selectLocation(page);

      cleanupRequired = true;
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByText('Registro creado correctamente')).toBeVisible();

      const search = page.getByPlaceholder(/Buscar ciudad/i);
      await search.fill(createdName);
      await page.getByRole('button', {
        name: `Editar ${createdName}`,
        exact: true,
      }).click();

      await expect(page.getByLabel(/^Nombre/)).toHaveValue(createdName);
      await page.getByLabel(/^Nombre/).fill(editedName);
      await page.getByRole('button', { name: 'Guardar', exact: true }).click();
      await expect(page.getByText('Registro actualizado correctamente')).toBeVisible();

      await search.fill(editedName);
      const deleteButton = page.getByRole('button', {
        name: `Eliminar ${editedName}`,
        exact: true,
      });
      await expect(deleteButton).toBeVisible();
      await deleteButton.click();

      const dialog = page.getByRole('alertdialog');
      await dialog.getByLabel(/Escribe eliminar para confirmar/i).fill('eliminar');
      await dialog.getByRole('button', { name: 'Eliminar', exact: true }).click();
      await expect(page.getByText('Registro eliminado correctamente')).toBeVisible();
      await expect(deleteButton).toBeHidden();
      cleanupRequired = false;
    } finally {
      if (cleanupRequired) {
        await cleanupCity(page, [editedName, createdName]);
      }
    }
  });
});
