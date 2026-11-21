import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReportTable } from '@/components/reports/ReportTable';

vi.mock('@/utils/supabase/client', () => ({
  createClient: () => ({ rpc: vi.fn().mockResolvedValue({ data: [{ role: 'admin', can_read_reports: true }], error: null }) }),
}));
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('muestra la tabla y exporta las filas actualizadas con caracteres especiales', async () => {
  const refresh = vi.fn();
  const fresh = [
    { name: 'José, "Juan"', amount: 3 },
    { name: 'Otra\nlínea', amount: null },
    { name: undefined, amount: 0 },
  ];
  const createURL = vi.fn((_value: Blob) => 'blob:test');
  vi.stubGlobal('URL', class extends URL { static createObjectURL = createURL; static revokeObjectURL = vi.fn(); });
  const download = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  render(<ReportTable title="Mi reporte" description="Listado" loading={false} onRefresh={refresh}
    loadExportRows={vi.fn().mockResolvedValue(fresh)}
    columns={[{ key: 'name', label: 'Nombre' }, { key: 'amount', label: 'Total', render: value => `Total: ${value}` }]}
    data={[{ name: 'Anterior', amount: 3 }]} />);

  expect(screen.getByText('Total: 3')).toBeVisible();
  fireEvent.click(screen.getByText('Actualizar'));
  expect(refresh).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByText('Exportar CSV'));
  await waitFor(() => expect(download).toHaveBeenCalledOnce());
  const csv = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.readAsText(createURL.mock.calls[0][0]);
  });
  expect(csv).not.toContain('Anterior');
  expect(csv).toContain('"José, ""Juan""",3');
  expect(csv).toContain('"Otra\nlínea",');
  expect((download.mock.instances[0] as HTMLAnchorElement).download).toMatch(/^reporte_.*\.csv$/);
});

it('distingue carga de lista vacía y deshabilita exportación', () => {
  const props = { title: 'Reporte', description: 'Listado', columns: [], data: [], onRefresh: vi.fn(), loadExportRows: vi.fn() };
  const view = render(<ReportTable {...props} loading />);
  expect(screen.getByText('Cargando datos...')).toBeVisible();
  expect(screen.getByText('Actualizar')).toBeDisabled();
  view.rerender(<ReportTable {...props} loading={false} />);
  expect(screen.getByText('No hay datos disponibles')).toBeVisible();
  expect(screen.getByText('Exportar CSV')).toBeDisabled();
});
