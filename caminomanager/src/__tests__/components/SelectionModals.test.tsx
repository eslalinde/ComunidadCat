import { cleanup, fireEvent, render as renderUI, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SelectBrotherModal } from '@/components/crud/SelectBrotherModal';
import { SelectPersonForTeamModal } from '@/components/crud/SelectPersonForTeamModal';
import { SelectPriestModal } from '@/components/crud/SelectPriestModal';
import { SelectParishModal } from '@/components/crud/SelectParishModal';
import { SelectBrotherForTeamModal } from '@/components/crud/SelectBrotherForTeamModal';
import { MarriageModal } from '@/components/crud/MarriageModal';
import { createQueryHarness, createTableMock, type QueryResponse } from '../helpers/queryHarness';
import type { MergedBrother } from '@/hooks/useCommunityData';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
let harness: ReturnType<typeof createQueryHarness>;
const render = (ui: Parameters<typeof renderUI>[0]) => renderUI(ui, { wrapper: harness.wrapper });
let responses: Record<string, QueryResponse>;
let mock: ReturnType<typeof createTableMock>;
const close = vi.fn(), select = vi.fn();
beforeEach(() => {
  harness = createQueryHarness();
  vi.clearAllMocks(); db.from.mockReset(); select.mockResolvedValue(undefined); vi.spyOn(console, 'error').mockImplementation(() => {});
  responses = {
    people: { data: [{ id: 1, person_name: 'José', mobile: '300', email: 'j@example.com' }, { id: 2, person_name: 'Asignado' }], error: null },
    brothers: { data: [{ person_id: 2 }], error: null }, priests: { data: [{ person_id: 2 }], error: null },
    parishes: { data: [{ id: 1, name: 'José', address: 'Calle 1', diocese: { name: 'Central' } }, { id: 2, name: 'Asignado' }], error: null },
  };
  mock = createTableMock(responses); db.from.mockImplementation(mock.from);
});
afterEach(() => { cleanup(); harness.client.clear(); vi.restoreAllMocks(); });
const cases = [
  { name: 'hermano', button: 'Agregar Hermano', table: 'people', render: (open = true) => <SelectBrotherModal open={open} onClose={close} onSelect={select} communityId={10} /> },
  { name: 'persona', button: 'Agregar Persona', table: 'people', render: (open = true) => <SelectPersonForTeamModal open={open} onClose={close} onSelect={select} excludePersonIds={[2]} /> },
  { name: 'sacerdote', button: 'Asignar Sacerdote', table: 'people', render: (open = true) => <SelectPriestModal open={open} onClose={close} onSelect={select} parishId={10} /> },
  { name: 'parroquia', button: 'Agregar Parroquia', table: 'parishes', render: (open = true) => <SelectParishModal open={open} onClose={close} onSelect={select} excludeParishIds={[2]} /> },
];
describe.each(cases)('Selección de $name', (testCase) => {
  it('excluye asignados, busca sin tildes y entrega la selección', async () => {
    render(testCase.render()); expect(screen.getByRole('button', { name: testCase.button })).toBeDisabled();
    await screen.findByText('José'); expect(screen.queryByText('Asignado')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), { target: { value: 'nadie' } });
    expect(screen.getByText(/No se encontraron/)).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), { target: { value: 'JOSE' } });
    fireEvent.click(screen.getByText('José'));
    if (testCase.name === 'sacerdote') { fireEvent.click(screen.getByText('Párroco')); fireEvent.click(screen.getByText('Vicario')); fireEvent.click(screen.getByText('Párroco')); }
    fireEvent.click(screen.getByRole('button', { name: testCase.button }));
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(select).toHaveBeenCalledWith(...(testCase.name === 'sacerdote' ? [1, true] : [1]));
    if (testCase.name === 'sacerdote') expect(mock.calls).toContainEqual({ table: 'people', method: 'eq', args: ['person_type_id', 3] });
  });
  it('mantiene abierto al fallar la operación y permite cancelar', async () => {
    select.mockRejectedValue(new Error('Permiso denegado: operación rechazada')); render(testCase.render());
    fireEvent.click(await screen.findByText('José')); fireEvent.click(screen.getByRole('button', { name: testCase.button }));
    await screen.findByText('Permiso denegado: operación rechazada'); expect(close).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Cancelar')); expect(close).toHaveBeenCalledOnce();
  });
  it('maneja consultas vacías y no consulta estando cerrado', async () => {
    const view = render(testCase.render(false)); expect(db.from).not.toHaveBeenCalled();
    responses[testCase.table].data = null; view.rerender(testCase.render());
    await screen.findByText(/No hay .* disponibles/); expect(select).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
  });
  it('presenta error de consulta sin habilitar el guardado', async () => {
    responses[testCase.table].error = { message: 'denied' }; render(testCase.render());
    await screen.findByText('Error al cargar las ' + (testCase.table === 'people' ? 'personas' : 'parroquias') + ' disponibles');
    expect(screen.getByRole('button', { name: testCase.button })).toBeDisabled();
  });
});
it.each(['brothers', 'priests'])('detiene selección cuando falla la consulta previa de %s', async (table) => {
  responses[table].error = { message: 'denied' }; render(cases[table === 'brothers' ? 0 : 2].render());
  await screen.findByText('Error al cargar las personas disponibles'); expect(db.from).not.toHaveBeenCalledWith('people');
});

describe('Selección de hermanos para equipo', () => {
  const brothers: MergedBrother[] = [
    { id: 'm', name: 'José y María', personIds: [1, 2], isMarriage: true, isPresbitero: false, isItinerante: false, carisma: 'Matrimonio', celular: '300', createdAt: null },
    { id: 's', name: 'Pedro', personIds: [3], isMarriage: false, isPresbitero: false, isItinerante: false, carisma: '', celular: '', createdAt: null },
  ];
  it.each([false, true])('incluye matrimonio parcialmente asignado, error=%s', async (fails) => {
    if (fails) select.mockRejectedValue(new Error('Permiso denegado'));
    render(<SelectBrotherForTeamModal open onClose={close} onSelect={select} brothers={brothers} teamMembers={[{ person_id: 1, team_id: 1, community_id: 1, is_responsible_for_the_team: true }, { person_id: 3, team_id: 1, community_id: 1, is_responsible_for_the_team: false }]} />);
    expect(screen.queryByText('Pedro')).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), { target: { value: 'nadie' } }); expect(screen.getByText('No se encontraron hermanos con ese nombre')).toBeVisible();
    fireEvent.change(screen.getByPlaceholderText('Buscar por nombre...'), { target: { value: 'jose' } }); fireEvent.click(screen.getByText('José y María'));
    fireEvent.click(screen.getByText('Agregar al Equipo'));
    await waitFor(() => expect(select).toHaveBeenCalledWith([1, 2]));
    if (fails) { await screen.findByText('Permiso denegado'); expect(close).not.toHaveBeenCalled(); }
    else await waitFor(() => expect(close).toHaveBeenCalledOnce());
  });
  it('informa lista vacía y cierra con Escape', () => {
    render(<SelectBrotherForTeamModal open onClose={close} onSelect={select} brothers={[]} teamMembers={[]} />);
    expect(screen.getByText('Todos los hermanos ya están en este equipo')).toBeVisible();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
  });
});
describe('MarriageModal', () => {
  it.each(['ok', 'husband', 'wife', 'link'])('crea vínculos recíprocos o muestra error en %s', async (scenario) => {
    const queries = [1, 2, 3].map((id, i) => createTableMock({ people: { data: { id }, error: ['husband', 'wife', 'link'][i] === scenario ? { message: 'denied' } : null } }));
    db.from.mockImplementationOnce(queries[0].from).mockImplementationOnce(queries[1].from).mockImplementationOnce(queries[2].from);
    render(<MarriageModal open onClose={close} onSuccess={select} />);
    fireEvent.change(screen.getByLabelText('Nombre del Esposo *'), { target: { value: 'Juan' } });
    fireEvent.change(screen.getByLabelText('Nombre de la Esposa *'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getAllByLabelText('Email')[0], { target: { value: 'juan@example.com' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear Matrimonio' }));
    if (scenario === 'ok') {
      await waitFor(() => expect(select).toHaveBeenCalledWith(1, 2)); expect(close).toHaveBeenCalledOnce();
      expect(queries[1].calls).toContainEqual({ table: 'people', method: 'insert', args: [expect.objectContaining({ spouse_id: 1, gender_id: 2, phone: null })] });
      expect(queries[2].calls).toContainEqual({ table: 'people', method: 'update', args: [{ spouse_id: 2 }] });
    } else { await screen.findByText('Error al crear el matrimonio'); expect(select).not.toHaveBeenCalled(); expect(close).not.toHaveBeenCalled(); }
    expect(db.from).toHaveBeenCalledTimes(scenario === 'husband' ? 1 : scenario === 'wife' ? 2 : 3);
  });
  it('valida nombres antes de guardar y permite cancelar', async () => {
    const view = render(<MarriageModal open={false} onClose={close} onSuccess={select} />); expect(screen.queryByText('Crear Matrimonio')).not.toBeInTheDocument();
    view.rerender(<MarriageModal open onClose={close} onSuccess={select} />);
    fireEvent.click(screen.getByRole('button', { name: 'Crear Matrimonio' }));
    await screen.findByText('El nombre del esposo es requerido'); expect(screen.getByText('El nombre de la esposa es requerido')).toBeVisible();
    expect(db.from).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Cancelar')); expect(close).toHaveBeenCalledOnce();
  });
});
