import { type AppTableFeatures, appTableFeatures } from "@/lib/tableFeatures";
import { cleanup, renderHook } from '@testing-library/react';
import { createColumnHelper, useTable } from '@tanstack/react-table';
import { afterEach, expect, it, vi } from 'vitest';
import { exportTableToCSV, getAggregationFn } from '@/components/reports/dynamic-table/utils';
type Item = { name: string | null; amount: string | number; group: string; hidden: string };
const helper = createColumnHelper<AppTableFeatures, Item>();
const data: Item[] = [{ name: 'Juan, "José"', amount: 2, group: 'A', hidden: 'secreto' }, { name: 'Línea\nNueva', amount: '3', group: 'A', hidden: 'secreto' }, { name: null, amount: 'bad', group: 'B', hidden: 'secreto' }];
const columns = helper.columns([helper.accessor('name', { header: 'NOMBRE' }), helper.accessor('amount', { header: () => 'Monto' }), helper.accessor('group', { header: 'GRUPO' }), helper.accessor('hidden', { header: 'Oculto' })]);
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('exporta sólo columnas visibles, con BOM, escape CSV y filas filtradas', async () => {
  let blob: Blob | undefined; let name = '';
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn((b: Blob) => { blob = b; return 'blob:test'; }), revokeObjectURL: vi.fn() }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { name = this.download; });
  const { result } = renderHook(() => useTable({
    features: appTableFeatures,
    data,
    columns,
    initialState: {
      columnVisibility: { hidden: false },
      columnFilters: [{ id: 'group', value: 'A' }],
      grouping: ['group'],
      pagination: { pageIndex: 0, pageSize: 1 },
    },
  }));
  exportTableToCSV(result.current, 'reporte');
  const bytes = await new Promise<ArrayBuffer>((resolve) => { const r = new FileReader(); r.onload = () => resolve(r.result as ArrayBuffer); r.readAsArrayBuffer(blob!); });
  expect([...new Uint8Array(bytes).slice(0, 3)]).toEqual([239, 187, 191]);
  const csv = new TextDecoder().decode(bytes); expect(csv).toContain('Grupo,Nombre,Amount'); expect(csv).toContain('A,"Juan, ""José""",2'); expect(csv).toContain('A,"Línea\nNueva",3'); expect(csv).not.toContain('secreto'); expect(csv).not.toContain('B,,bad'); expect(name).toMatch(/^reporte_\d{4}-\d{2}-\d{2}\.csv$/); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
});
it('agrega valores numéricos y únicos con las definiciones de TanStack 9', () => {
  const aggregationColumns = helper.columns([
    helper.accessor('amount', { aggregationFn: getAggregationFn<Item, Item['amount']>('sum') }),
    helper.accessor('name', { aggregationFn: getAggregationFn<Item, Item['name']>('count') }),
    helper.accessor('group', { aggregationFn: getAggregationFn<Item, string>('uniqueCount') }),
    helper.accessor('name', { id: 'uniqueNames', aggregationFn: getAggregationFn<Item, Item['name']>('uniqueCount') }),
  ]);
  const { result } = renderHook(() => useTable({
    features: appTableFeatures,
    data,
    columns: aggregationColumns,
    initialState: { grouping: ['group'] },
    manualPagination: true,
  }));
  expect(result.current.getColumn('amount')!.getAggregationValue()).toBe(5);
  expect(result.current.getColumn('name')!.getAggregationValue()).toBe(3);
  expect(result.current.getColumn('group')!.getAggregationValue()).toBe(2);
  expect(result.current.getColumn('uniqueNames')!.getAggregationValue()).toBe(2);
  expect(result.current.getGroupedRowModel().rows[0].getValue('amount')).toBe(5);
  expect(getAggregationFn<Item>(undefined)).toBeUndefined();
});
