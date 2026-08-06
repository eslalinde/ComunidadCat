import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createColumnHelper } from '@tanstack/react-table';
import { describe, expect, it, vi } from 'vitest';

import { DynamicReportTable } from '@/components/reports/dynamic-table';
import type {
  DynamicColumnMeta,
  DynamicReportConfig,
} from '@/components/reports/dynamic-table';

interface ReportRow {
  diocese: string;
  parish: string;
  community: string;
  members: number;
}

const columnHelper = createColumnHelper<ReportRow>();
const columns = [
  columnHelper.accessor('diocese', {
    header: 'Diócesis',
    meta: { filterType: 'select' } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor('parish', {
    header: 'Parroquia',
    meta: { filterType: 'text' } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor('community', {
    header: 'Comunidad',
    meta: { filterType: 'text' } satisfies DynamicColumnMeta,
  }),
  columnHelper.accessor('members', {
    header: 'Hermanos',
    meta: {
      align: 'center',
      aggregationType: 'sum',
      aggregationLabel: 'Total',
    } satisfies DynamicColumnMeta,
  }),
];

const data: ReportRow[] = Array.from({ length: 7 }, (_, index) => ({
  diocese: index < 5 ? 'Medellín' : 'Bogotá',
  parish: `Parroquia ${index + 1}`,
  community: `Comunidad ${index + 1}`,
  members: index + 1,
}));

const config: DynamicReportConfig<ReportRow> = {
  title: 'Reporte piloto',
  description: 'Validación del DataGrid de reportes',
  columns,
  defaultSorting: [{ id: 'parish', desc: false }],
  dataGrid: { pageSize: 5 },
};

describe('DynamicReportTable con DataGrid', () => {
  it('pagina los resultados y conserva el orden accesible', async () => {
    const user = userEvent.setup();
    render(
      <DynamicReportTable
        config={config}
        data={data}
        loading={false}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText('Página 1 de 2 · 7 registros')).toBeVisible();
    expect(screen.getByText('Comunidad 5')).toBeVisible();
    expect(screen.queryByText('Comunidad 6')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Parroquia/ })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    expect(screen.getByText('Página 2 de 2 · 7 registros')).toBeVisible();
    expect(screen.getByText('Comunidad 6')).toBeVisible();
  });

  it('permite ocultar columnas sin afectar el modelo de datos', async () => {
    const user = userEvent.setup();
    render(
      <DynamicReportTable
        config={config}
        data={data}
        loading={false}
        onRefresh={vi.fn()}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Columnas' }));
    const parishOption = screen.getByRole('menuitemcheckbox', {
      name: 'Parroquia',
    });
    expect(parishOption).toHaveAttribute('aria-checked', 'true');

    await user.click(parishOption);

    expect(
      screen.queryByRole('columnheader', { name: /Parroquia/ }),
    ).not.toBeInTheDocument();
    expect(data).toHaveLength(7);
  });

  it('calcula los totales sobre todos los resultados filtrados, no sólo la página', async () => {
    const user = userEvent.setup();
    render(
      <DynamicReportTable
        config={config}
        data={data}
        loading={false}
        onRefresh={vi.fn()}
      />,
    );

    expect(screen.getByText('Total: 28')).toBeVisible();

    await user.type(
      screen.getByPlaceholderText('Buscar en todos los campos...'),
      'Bogotá',
    );

    expect(await screen.findByText('Total: 13')).toBeVisible();
    expect(screen.getByText('Página 1 de 1 · 2 registros')).toBeVisible();
  });
});
