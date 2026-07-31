import { expect, test } from '../fixtures/auth.fixture';

test.describe('Reporte de Equipos de Catequistas — DataGrid', () => {
  test.beforeEach(async ({ page, loginAs }) => {
    await loginAs('admin');
    await page.goto('/reportes/equipos-catequistas');
    await page.waitForLoadState('networkidle');
  });

  test('ordena, pagina y permite elegir columnas', async ({ page }, testInfo) => {
    const table = page.getByRole('table');
    await expect(table).toBeVisible();
    const pageStatus = page.getByText(/^Página 1 de \d+ · \d+ registros$/);
    await expect(pageStatus).toBeVisible();
    const statusText = await pageStatus.textContent();
    const statusMatch = statusText?.match(
      /^Página 1 de (\d+) · (\d+) registros$/,
    );
    expect(statusMatch).not.toBeNull();
    const pageCount = Number(statusMatch![1]);
    const recordCount = Number(statusMatch![2]);
    expect(pageCount).toBeGreaterThan(1);
    expect(recordCount).toBeGreaterThan(5);

    const dioceseHeader = page.getByRole('columnheader', {
      name: /Arquidiócesis\/Diócesis/,
    });
    await expect(dioceseHeader).toHaveAttribute('aria-sort', 'ascending');
    await dioceseHeader.getByRole('button').focus();
    await page.keyboard.press('Enter');
    await expect(dioceseHeader).toHaveAttribute('aria-sort', 'descending');

    const bodyRows = table.locator('tbody tr');
    const responsibleName = (
      (await bodyRows.first().getByRole('cell').nth(3).textContent()) ?? ''
    ).trim();
    expect(responsibleName).not.toBe('');
    const responsibleFilter = page
      .getByRole('columnheader', { name: /Responsable/ })
      .getByPlaceholder('Filtrar...');
    await responsibleFilter.fill(responsibleName);
    const filteredStatus = page.getByText(/^Página 1 de 1 · \d+ registros$/);
    await expect(filteredStatus).toBeVisible();
    const filteredCount = Number(
      (await filteredStatus.textContent())?.match(/· (\d+) registros/)?.[1],
    );
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(recordCount);
    for (let index = 0; index < (await bodyRows.count()); index += 1) {
      await expect(bodyRows.nth(index).getByRole('cell').nth(3)).toHaveText(
        responsibleName,
      );
    }
    await responsibleFilter.fill('');
    await expect(pageStatus).toHaveText(
      `Página 1 de ${pageCount} · ${recordCount} registros`,
    );

    await page.getByRole('button', { name: 'Columnas', exact: true }).click();
    const parishColumn = page.getByRole('menuitemcheckbox', {
      name: 'Parroquia que Lleva',
    });
    await expect(parishColumn).toHaveAttribute('aria-checked', 'true');
    await parishColumn.click();
    await expect(
      page.getByRole('columnheader', { name: /Parroquia que Lleva/ }),
    ).toBeHidden();
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(
      page.getByText(`Página 2 de ${pageCount} · ${recordCount} registros`),
    ).toBeVisible();
    if (pageCount === 2) {
      await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    }

    if (testInfo.project.name === 'chromium-mobile') {
      const overflowsHorizontally = await table.evaluate((element) => {
        const container = element.parentElement;
        return Boolean(container && container.scrollWidth > container.clientWidth);
      });
      expect(overflowsHorizontally).toBe(true);
    }
  });
});
