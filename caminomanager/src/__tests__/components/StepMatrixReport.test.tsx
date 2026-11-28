import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import Report from '@/app/(main)/(protected)/reportes/estado-pasos/page';
import { createTableMock, type QueryResponse } from '../helpers/queryHarness';
const db = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
let responses: Record<string, QueryResponse>; let blob: Blob | undefined; let download = '';
const scope = { role: 'zone_leader', zone_id: 1, community_id: null, granted_community_ids: [], person_id: null, can_read_reports: true };
beforeEach(() => {
  blob = undefined;
  download = '';
  db.rpc.mockResolvedValue({ data: [scope], error: null });
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
  fireEvent.click(screen.getByText('Exportar CSV')); await waitFor(() => expect(download).toBe('estado_pasos.csv'));
  const csv = await new Promise<string>((resolve) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.readAsText(blob!); });
  expect(csv).toContain('"San ""José""","2ª, 10ª, Aª","","3"'); expect(csv).toContain('"Total por Paso","3","1","4"'); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
  fireEvent.click(screen.getByText('Imprimir')); await waitFor(() => expect(window.print).toHaveBeenCalledOnce());
  fireEvent.click(screen.getByText('Actualizar')); await waitFor(() => expect(db.from).toHaveBeenCalledTimes(8));
});
it.each(['Exportar CSV', 'Imprimir'])('bloquea %s tras la revocación de permisos', async (action) => {
  render(<Report />);
  await screen.findByText('San Andrés');
  db.rpc.mockResolvedValue({ data: [{ ...scope, can_read_reports: false }], error: null });
  fireEvent.click(screen.getByRole('button', { name: action }));
  await screen.findByRole('alert');
  expect(db.rpc).toHaveBeenLastCalledWith('get_user_scope');
  expect(db.from).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('San Andrés')).toBeNull();
  expect(blob).toBeUndefined();
  expect(window.print).not.toHaveBeenCalled();
});

it('usa sólo la zona actual tanto para exportar como para imprimir', async () => {
  const { container } = render(<Report />);
  await screen.findByText('San Andrés');
  responses.communities.data = [{ id: 7, number: '1', parish_id: 4, parish: { name: '+Nueva parroquia' }, step_way_id: 1 }];
  responses.step_ways.data = [{ id: 1, name: '+Nueva etapa', order_num: 1 }];
  fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
  await waitFor(() => expect(download).toBe('estado_pasos.csv'));
  const reader = new FileReader();
  const text = new Promise<string>((resolve) => { reader.onload = () => resolve(String(reader.result)); });
  reader.readAsText(blob!);
  const csv = await text;
  expect(csv).toContain(`"'+Nueva parroquia"`);
  expect(csv).toContain(`"'+Nueva etapa"`);
  expect(csv).not.toContain('San Andrés');
  expect(container.firstElementChild).toHaveClass('print:hidden');
  responses.communities.data = [{ id: 8, number: '2', parish_id: 5, parish: { name: 'Parroquia impresa' }, step_way_id: 1 }];
  let printed = '';
  vi.mocked(window.print).mockImplementation(() => {
    printed = container.textContent || '';
    expect(container.firstElementChild).not.toHaveClass('print:hidden');
  });
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
  await waitFor(() => expect(window.print).toHaveBeenCalledOnce());
  expect(printed).toContain('Parroquia impresa');
  expect(printed).not.toContain('Nueva parroquia');
  expect(container.firstElementChild).toHaveClass('print:hidden');
});

it('un error al actualizar los datos protegidos bloquea la descarga de la copia anterior', async () => {
  render(<Report />);
  await screen.findByText('San Andrés');
  responses.communities.error = { message: 'No disponible' };
  fireEvent.click(screen.getByRole('button', { name: 'Exportar CSV' }));
  await screen.findByRole('alert');
  expect(blob).toBeUndefined();
  expect(screen.queryByText('San Andrés')).toBeNull();
});

it('revalida el permiso al terminar la lectura para imprimir', async () => {
  render(<Report />);
  await screen.findByText('San Andrés');
  db.rpc.mockResolvedValueOnce({ data: [scope], error: null })
    .mockResolvedValueOnce({ data: [{ ...scope, zone_id: 2 }], error: null });
  fireEvent.click(screen.getByRole('button', { name: 'Imprimir' }));
  await screen.findByRole('alert');
  expect(db.from).toHaveBeenCalledTimes(4);
  expect(window.print).not.toHaveBeenCalled();
});
it.each(['communities', 'step_ways', 'throw', 'empty'])('termina carga ante resultado %s', async (scenario) => {
  if (scenario === 'throw') db.from.mockImplementation(() => { throw new Error(); });
  else if (scenario === 'empty') { responses.communities.data = null; responses.step_ways.data = null; }
  else responses[scenario].error = { message: 'denied' };
  render(<Report />); await screen.findByText('No hay datos disponibles'); expect(screen.getByText('Exportar CSV')).toBeDisabled(); expect(screen.getByText('Actualizar')).toBeEnabled();
});
