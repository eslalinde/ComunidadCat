import { expect, test } from '../fixtures/auth.fixture';

const dynamicReports = [
  {
    path: '/reportes/equipos-catequistas',
    title: 'Equipos de Catequistas',
  },
  { path: '/reportes/presbiteros', title: 'Presbíteros' },
  {
    path: '/reportes/lideres-comunidades',
    title: 'Responsables de Comunidades',
  },
  {
    path: '/reportes/catequesis-parroquia',
    title: 'Catequesis por Parroquia',
  },
];

test.describe('DataGrid en todos los reportes', () => {
  test.beforeEach(async ({ loginAs }) => {
    await loginAs('admin');
  });

  for (const report of dynamicReports) {
    test(`${report.title} usa la fachada común`, async ({ page }, testInfo) => {
      await page.goto(report.path);
      await page.waitForLoadState('networkidle');

      await expect(
        page.getByRole('heading', { name: report.title, exact: true }),
      ).toBeVisible();
      const grid = page.locator('[data-slot="data-grid"]');
      await expect(grid).toBeVisible();
      await expect(grid.getByRole('table')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Columnas', exact: true }),
      ).toBeVisible();
      await expect(
        page
          .getByText(/^Página 1 de \d+ · \d+ registros$/)
          .or(grid.getByText('No hay datos disponibles')),
      ).toBeVisible();

      if (testInfo.project.name === 'chromium-mobile') {
        await expect
          .poll(() =>
            grid.evaluate(
              (element) => element.scrollWidth > element.clientWidth,
            ),
          )
          .toBe(true);
      }
    });
  }

  test('Estado de Comunidades usa DataGrid y conserva sus totales', async ({
    page,
  }) => {
    await page.goto('/reportes/estado-pasos');
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByRole('heading', { name: 'Estado de Comunidades' }),
    ).toBeVisible();
    const grid = page.locator('[data-slot="data-grid"]');
    await expect(grid).toBeVisible();
    await expect(grid.getByRole('table')).toBeVisible();
    await expect(grid.getByRole('columnheader', { name: /Parroquia/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    const emptyState = grid.getByText('No hay datos disponibles');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    } else {
      await expect(grid.getByText('Total por Paso')).toBeVisible();
      await expect(page.getByText(/\d+ parroquias · \d+ comunidades/)).toBeVisible();
    }
  });
});
