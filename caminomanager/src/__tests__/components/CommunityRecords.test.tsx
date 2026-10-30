import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityInventory } from '@/components/crud/CommunityInventory';
import { CommunityVisits } from '@/components/crud/CommunityVisits';
import { CommunityStepLogCompact } from '@/components/crud/CommunityStepLogCompact';
import { createQueryHarness, createTableMock, type QueryResponse } from '../helpers/queryHarness';
import { FormDouble, DeleteDouble, type FormDoubleProps } from '../helpers/modalDoubles';
import { toast } from 'sonner';
import type { ComponentProps } from 'react';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u' } }) }));
vi.mock('@/components/crud/DynamicEntityModal', () => ({ DynamicEntityModal: (p: FormDoubleProps) => <FormDouble {...p} /> }));
vi.mock('@/components/crud/ConfirmDeleteDialog', () => ({ ConfirmDeleteDialog: (p: ComponentProps<typeof DeleteDouble>) => <DeleteDouble {...p} /> }));
let harness: ReturnType<typeof createQueryHarness>;
let mock: ReturnType<typeof createTableMock>;
let responses: Record<string, QueryResponse>;
const ok = (data: unknown = null, count = 1): QueryResponse => ({ data, error: null, count });
const save = (data: Record<string, unknown>) => {
  fireEvent.change(screen.getByLabelText('Datos del formulario'), { target: { value: JSON.stringify(data) } });
  fireEvent.click(screen.getByText('Guardar formulario'));
};
beforeEach(() => {
  vi.clearAllMocks(); harness = createQueryHarness();
  responses = { inventory_item_types: ok([{ id: 1, name: 'Cáliz' }]), community_inventory: ok([]), community_visits: ok([]), community_step_log: ok(), communities: ok() };
  mock = createTableMock(responses); db.from.mockImplementation(mock.from);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); harness.client.clear(); vi.restoreAllMocks(); });

describe('inventario', () => {
  const setup = () => render(<CommunityInventory communityId={10} communityNumber="1" />, { wrapper: harness.wrapper });
  it.each([true, false])('crea elemento de catálogo=%s y normaliza campos', async (catalogue) => {
    setup(); await screen.findByText('No hay elementos en el inventario');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    save({ item_type_id: catalogue ? 1 : '', custom_name: catalogue ? 'Ignorado' : 'Mantel', quantity: 2, condition: 'bueno', notes: 'Nota' });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Elemento agregado al inventario'));
    expect(mock.calls).toContainEqual({ table: 'community_inventory', method: 'insert', args: [{ community_id: 10, item_type_id: catalogue ? 1 : null, custom_name: catalogue ? null : 'Mantel', quantity: 2, condition: 'bueno', notes: 'Nota', created_by: 'u' }] });
  });
  it('valida nombre, cancela y conserva el formulario si falla la creación', async () => {
    setup(); await screen.findByText('No hay elementos en el inventario');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' })); save({});
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mock.calls.some((c) => c.method === 'insert')).toBe(false);
    responses.community_inventory.error = { message: 'Sin permiso' }; save({ custom_name: 'Mantel' });
    await screen.findByRole('alert');
    expect(toast.success).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Cerrar formulario'));
    expect(screen.queryByLabelText('Datos del formulario')).not.toBeInTheDocument();
  });
  it.each([true, false])('edita elemento como catálogo=%s y rechaza datos incompletos', async (catalogue) => {
    responses.community_inventory = ok([{ id: 1, quantity: 1, custom_name: 'Mantel' }]); setup();
    fireEvent.click(await screen.findByTitle('Editar elemento')); save({});
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    save(catalogue ? { item_type_id: 1 } : { custom_name: 'Nuevo' });
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Elemento actualizado'));
    expect(mock.calls).toContainEqual({ table: 'community_inventory', method: 'update', args: [{ quantity: 1, condition: null, notes: null, item_type_id: catalogue ? 1 : null, custom_name: catalogue ? null : 'Nuevo' }] });
  });
  it('muestra lista completa, estados, notas y permite cerrar la edición fallida', async () => {
    responses.community_inventory = ok(['nuevo', 'bueno', 'regular', 'malo', 'otro', undefined, 'bueno'].map((condition, i) => ({ id: i + 1, quantity: i + 1, condition, notes: i % 2 ? 'Nota' : undefined, custom_name: i % 2 ? `Elemento ${i}` : undefined, item_type: i === 0 ? { name: 'Cáliz' } : undefined })));
    setup(); fireEvent.click(await screen.findByRole('button', { name: 'Ver todo (7)' }));
    expect(screen.getByText('Inventario - Comunidad 1')).toBeVisible();
    expect(screen.getAllByText('Elemento sin nombre').length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByTitle('Editar elemento').at(-1)!);
    responses.community_inventory.error = { message: 'Sin permiso' }; save({ custom_name: 'Nuevo' });
      await screen.findByText('Error al guardar'); fireEvent.click(screen.getByText('Cerrar formulario'));
  });
  it.each(['success', 'zero', 'error'])('borrado inventario: %s', async (scenario) => {
    responses.community_inventory = ok([{ id: 1, quantity: 2, condition: 'bueno', item_type: { name: 'Cáliz' } }]); setup();
    fireEvent.click(await screen.findByTitle('Eliminar elemento')); fireEvent.click(screen.getByText('Cancelar borrado'));
    expect(mock.calls.some((c) => c.method === 'delete')).toBe(false);
    fireEvent.click(screen.getByTitle('Eliminar elemento'));
    responses.community_inventory.count = scenario === 'zero' ? 0 : 1;
    responses.community_inventory.error = scenario === 'error' ? { message: 'Error' } : null;
    fireEvent.click(screen.getByText('Confirmar borrado'));
    await waitFor(() => expect(scenario === 'success' ? toast.success : toast.error).toHaveBeenCalled());
    expect(mock.calls).toContainEqual({ table: 'community_inventory', method: 'eq', args: ['id', 1] });
  });
});

describe('visitas', () => {
  const setup = () => render(<CommunityVisits communityId={10} communityNumber="1" defaultVisitorName="Catequista" />, { wrapper: harness.wrapper });
  it.each([false, true])('registra visita, error=%s', async (fails) => {
    setup(); await screen.findByText('No hay visitas registradas');
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    if (fails) responses.community_visits.error = { message: 'Error' };
    save({ visit_date: '2026-10-30', description: 'Visita' });
    if (fails) { await screen.findByRole('alert'); fireEvent.click(screen.getByText('Cerrar formulario')); }
    else await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Visita registrada'));
    expect(mock.calls).toContainEqual({ table: 'community_visits', method: 'insert', args: [{ visit_date: '2026-10-30', description: 'Visita', community_id: 10, created_by: 'u' }] });
  });
  it.each(['success', 'zero', 'error'])('lista completa y eliminación de visitas: %s', async (scenario) => {
    responses.community_visits = ok(Array.from({ length: 5 }, (_, i) => ({ id: i + 1, description: `Visita ${i}`, visit_date: i % 2 ? '2026-10-30' : undefined, visitor_name: i % 2 ? 'Ana' : undefined, topics_discussed: i % 2 ? 'Tema' : undefined })));
    setup(); fireEvent.click(await screen.findByRole('button', { name: 'Ver todas (5)' }));
    expect(screen.getByText('Visita 4')).toBeVisible(); fireEvent.click(screen.getAllByTitle('Eliminar visita').at(-1)!);
    fireEvent.click(screen.getByText('Cancelar borrado')); fireEvent.click(screen.getAllByTitle('Eliminar visita').at(-1)!);
    responses.community_visits.count = scenario === 'zero' ? 0 : 1; responses.community_visits.error = scenario === 'error' ? { message: 'Error' } : null;
    fireEvent.click(screen.getByText('Confirmar borrado'));
    await waitFor(() => expect(scenario === 'success' ? toast.success : toast.error).toHaveBeenCalled());
  });
});

describe('bitácora compacta', () => {
  const refresh = vi.fn();
  const entries = Array.from({ length: 5 }, (_, i) => ({ id: i + 1, community_id: 10, step_way_id: 1, date_of_step: i % 2 ? '2026-10-30' : undefined, notes: i % 2 ? 'Nota' : undefined, outcome: i % 3 === 0 ? true : i % 3 === 1 ? false : undefined, principal_catechist_name: i % 2 ? 'Ana' : undefined, step_way: i % 2 ? { id: 1, name: 'Paso' } : undefined }));
  const setup = (extra: Partial<ComponentProps<typeof CommunityStepLogCompact>> = {}) => render(<CommunityStepLogCompact communityId={10} communityNumber="1" stepLogs={entries} loading={false} onStepLogAdded={refresh} onStepLogDeleted={refresh} {...extra} />);
  it.each(['true', 'false', ''])('normaliza resultado %s y actualiza etapa solo al cerrar', async (outcome) => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
    save({ outcome, step_way_id: '2', date_of_step: '2026-10-30', brothers_count: outcome ? '20' : '', notes: outcome === 'true' ? 'Nota' : '' });
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    const insert = mock.calls.find((c) => c.table === 'community_step_log' && c.method === 'insert')?.args[0];
    expect(insert).toMatchObject({ community_id: 10, outcome: outcome ? outcome === 'true' : null });
    expect(insert).not.toHaveProperty('brothers_count');
    if (outcome === 'true') expect(mock.calls).toContainEqual({ table: 'communities', method: 'update', args: [{ step_way_id: 2, last_step_way_date: '2026-10-30', actual_brothers: 20 }] });
    if (!outcome) expect(mock.calls.some((c) => c.table === 'communities')).toBe(false);
    expect(refresh).toHaveBeenCalled();
  });
  it('presenta carga, vacío y modo lectura sin acciones de escritura', () => {
    const view = setup({ loading: true }); expect(screen.queryByText('Agregar')).not.toBeInTheDocument();
    view.rerender(<CommunityStepLogCompact communityId={10} communityNumber="1" stepLogs={[]} loading={false} readOnly />);
    expect(screen.queryByText('Agregar')).not.toBeInTheDocument();
      expect(screen.getByText('No hay entradas en el log')).toBeVisible();
  });
  it('conserva formulario si falla el registro', async () => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Agregar' })); responses.community_step_log.error = { message: 'Error' };
    save({ outcome: 'true', step_way_id: '2' }); await screen.findByRole('alert');
    expect(refresh).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Cerrar formulario'));
  });
  it.each(['success', 'zero', 'error'])('abre todos los registros y borra con resultado %s', async (scenario) => {
    setup(); fireEvent.click(screen.getByRole('button', { name: 'Ver todos (5)' }));
    const buttons = screen.getAllByTitle(/Eliminar/); fireEvent.click(buttons.at(-1)!);
    fireEvent.click(screen.getByText('Cancelar borrado')); fireEvent.click(buttons.at(-1)!);
    responses.community_step_log.count = scenario === 'zero' ? 0 : 1; responses.community_step_log.error = scenario === 'error' ? { message: 'Error' } : null;
    fireEvent.click(screen.getByText('Confirmar borrado'));
    await waitFor(() => expect(scenario === 'success' ? toast.success : toast.error).toHaveBeenCalled());
  });
});
