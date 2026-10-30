import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ReportTable } from '@/components/reports/ReportTable';
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('renderiza valores, permite recarga y exporta CSV con caracteres especiales', async () => {
  let blob: Blob | undefined; let filename = ''; const refresh = vi.fn();
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn((value: Blob) => { blob = value; return 'blob:test'; }) }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { filename = this.download; });
  render(<ReportTable title="Mi reporte" description="Listado" loading={false} onRefresh={refresh} columns={[{ key: 'name', label: 'Nombre' }, { key: 'amount', label: 'Total', render: (value: unknown) => `Total: ${value}` }]} data={[{ name: 'José, "Juan"', amount: 3 }, { name: 'Otra\nlínea', amount: null }, { name: undefined, amount: 0 }]} />);
  expect(screen.getByText('Total: 3')).toBeVisible(); expect(screen.getByText('Mostrando 3 registros')).toBeVisible(); fireEvent.click(screen.getByText('Actualizar')); expect(refresh).toHaveBeenCalledOnce(); fireEvent.click(screen.getByText('Exportar CSV'));
  const csv = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob!); });
  expect(csv).toContain('"José, ""Juan""",3'); expect(csv).toContain('"Otra\nlínea",'); expect(filename).toMatch(/^reporte_.*\.csv$/);
});
it('distingue carga de lista vacía y deshabilita exportación', () => { const props = { title: 'Reporte', description: 'Listado', columns: [], data: [], onRefresh: vi.fn() }; const view = render(<ReportTable {...props} loading />); expect(screen.getByText('Cargando datos...')).toBeVisible(); expect(screen.getByText('Actualizar')).toBeDisabled(); view.rerender(<ReportTable {...props} loading={false} />); expect(screen.getByText('No hay datos disponibles')).toBeVisible(); expect(screen.getByText('Exportar CSV')).toBeDisabled(); });
