import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Report from '@/app/(main)/(protected)/reportes/estado-pasos/page';
import { createTableMock, type QueryResponse } from '../helpers/queryHarness';
const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
let responses: Record<string, QueryResponse>; let blob: Blob | undefined; let download = '';
beforeEach(() => {
  vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(window, 'print').mockImplementation(() => {});
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn((value: Blob) => { blob = value; return 'blob:test'; }), revokeObjectURL: vi.fn() }));
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) { download = this.download; });
  responses = { step_ways: { data: [{ id: 1, name: 'Inicio', order_num: 1 }, { id: 2, name: 'Segundo', order_num: 2 }], error: null }, communities: { data: [
    ...['10', '2', 'A'].map((number, i) => ({ id: i + 1, number, parish_id: 1, parish: { name: 'San "José"' }, step_way_id: 1, step_way: { name: 'Inicio' } })),
    { id: 4, number: '1', parish_id: 2, parish: { name: 'San Andrés' }, step_way_id: 2 },
    { id: 5, number: '3', parish_id: 3, step_way_id: null }, { id: 6, number: '4', parish_id: null, step_way_id: 1 },
  ], error: null } }; db.from.mockImplementation(createTableMock(responses).from);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('construye matriz ordenada, calcula totales y exporta CSV escapado', async () => {
  render(<Report />); await screen.findByText('2ª, 10ª, Aª');
  const row = screen.getByText('San "José"').closest('tr')!; expect(within(row).getByText('3')).toBeVisible();
  expect(screen.getByText('3 parroquias · 4 comunidades')).toBeVisible(); expect(screen.getByText('Sin Parroquia')).toBeVisible();
  fireEvent.click(screen.getByText('Exportar CSV')); expect(download).toBe('estado_pasos.csv');
  const csv = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob!); });
  expect(csv).toContain('"San ""José""","2ª, 10ª, Aª","","3"'); expect(csv).toContain('"Total por Paso","3","1","4"'); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  fireEvent.click(screen.getByText('Imprimir')); expect(window.print).toHaveBeenCalledOnce();
  fireEvent.click(screen.getByText('Actualizar')); await waitFor(() => expect(db.from).toHaveBeenCalledTimes(4));
});
it.each(['communities', 'step_ways', 'throw', 'empty'])('termina carga ante resultado %s', async (scenario) => {
  if (scenario === 'throw') db.from.mockImplementation(() => { throw new Error(); });
  else if (scenario === 'empty') { responses.communities.data = null; responses.step_ways.data = null; }
  else responses[scenario].error = { message: 'denied' };
  render(<Report />); await screen.findByText('No hay datos disponibles'); expect(screen.getByText('Exportar CSV')).toBeDisabled(); expect(screen.getByText('Actualizar')).toBeEnabled();
});
