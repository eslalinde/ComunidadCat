import { cleanup, renderHook } from '@testing-library/react';
import { createColumnHelper, getCoreRowModel, getFilteredRowModel, getGroupedRowModel, useReactTable } from '@tanstack/react-table';
import { afterEach, expect, it, vi } from 'vitest';
import { exportTableToCSV, getAggregationFn } from '@/components/reports/dynamic-table/utils';
type Item = { name: string | null; amount: string | number; group: string; hidden: string };
const helper = createColumnHelper<Item>();
const data: Item[] = [{ name: 'Juan, "José"', amount: 2, group: 'A', hidden: 'secreto' }, { name: 'Línea\nNueva', amount: '3', group: 'A', hidden: 'secreto' }, { name: null, amount: 'bad', group: 'B', hidden: 'secreto' }];
const columns = [helper.accessor('name', { header: 'NOMBRE' }), helper.accessor('amount', { header: () => 'Monto' }), helper.accessor('group', { header: 'GRUPO' }), helper.accessor('hidden', { header: 'Oculto' })];
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('exporta sólo columnas visibles, con BOM, escape CSV y filas filtradas', async () => {
  let blob: Blob | undefined; let name = '';
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => { blob = b; return 'blob:test'; }), revokeObjectURL: vi.fn() }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download; });
  const { result } = renderHook(() => useReactTable({ data, columns, initialState: { columnVisibility: { hidden: false } }, getCoreRowModel: getCoreRowModel(), getFilteredRowModel: getFilteredRowModel(), getGroupedRowModel: getGroupedRowModel() }));
  exportTableToCSV(result.current, 'reporte');
  const bytes = await new Promise<ArrayBuffer>((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result as ArrayBuffer); r.readAsArrayBuffer(blob!); });
  expect([...new Uint8Array(bytes).slice(0, 3)]).toEqual([239, 187, 191]);
  const csv = new TextDecoder().decode(bytes); expect(csv).toContain('Nombre,Amount,Grupo'); expect(csv).toContain('"Juan, ""José""",2,A'); expect(csv).toContain('"Línea\nNueva",3,A'); expect(csv).not.toContain('secreto'); expect(name).toMatch(/^reporte_\d{4}-\d{2}-\d{2}\.csv$/); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
});
it('agrega valores numéricos y únicos ignorando vacíos', () => {
  const { result } = renderHook(() => useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() })); const rows = result.current.getRowModel().rows;
  expect(getAggregationFn('sum')!('amount', [], rows)).toBe(5); expect(getAggregationFn('count')!('name', [], rows)).toBe(3); expect(getAggregationFn('uniqueCount')!('group', [], rows)).toBe(2); expect(getAggregationFn('uniqueCount')!('name', [], rows)).toBe(2); expect(getAggregationFn(undefined)).toBeUndefined();
});
