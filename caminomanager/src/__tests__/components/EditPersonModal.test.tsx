import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EditPersonModal } from '@/components/crud/EditPersonModal';
import { createQueryHarness, createTableMock, type QueryResponse } from '../helpers/queryHarness';
import { FormDouble, type FormDoubleProps } from '../helpers/modalDoubles';
import { toast } from 'sonner';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
vi.mock('@/components/crud/DynamicEntityModal', () => ({ DynamicEntityModal: (p: FormDoubleProps) => <FormDouble {...p} /> }));

const juan = { id: 1, person_name: 'Juan', mobile: '300', email: '' };
const ana = { id: 2, person_name: 'Ana', mobile: '' };
let harness: ReturnType<typeof createQueryHarness>;
let responses: Record<string, QueryResponse>;
let mock: ReturnType<typeof createTableMock>;
const close = vi.fn(), saved = vi.fn();

function setup(personIds: number[] | null) {
  return render(<EditPersonModal personIds={personIds} onClose={close} onSaved={saved} />, { wrapper: harness.wrapper });
}
const save = (data: Record<string, unknown>) => {
  fireEvent.change(screen.getByLabelText('Datos del formulario'), { target: { value: JSON.stringify(data) } });
  fireEvent.click(screen.getByText('Guardar formulario'));
};

beforeEach(() => {
  vi.clearAllMocks(); harness = createQueryHarness();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  responses = { people: { data: [juan, ana], error: null } };
  mock = createTableMock(responses); db.from.mockImplementation(mock.from);
});
afterEach(() => { cleanup(); harness.client.clear(); vi.restoreAllMocks(); });

describe('EditPersonModal', () => {
  it('no renderiza nada sin personas', () => {
    const { container } = setup(null);
    expect(container).toBeEmptyDOMElement();
    expect(db.from).not.toHaveBeenCalled();
  });

  it('abre directamente el formulario para una persona y guarda vacíos como null', async () => {
    setup([1]);
    expect(await screen.findByRole('heading', { name: 'Editar: Juan' })).toBeVisible();
    responses.people = { data: [{ id: 1 }], error: null };
    save({ person_name: 'Juan Pablo', email: '' });
    await waitFor(() => expect(close).toHaveBeenCalledOnce());
    expect(mock.calls).toContainEqual({ table: 'people', method: 'update', args: [{ person_name: 'Juan Pablo', email: null }] });
    expect(mock.calls).toContainEqual({ table: 'people', method: 'eq', args: ['id', 1] });
    expect(toast.success).toHaveBeenCalledWith('Datos actualizados');
    expect(saved).toHaveBeenCalledOnce();
  });

  it('en un matrimonio pregunta primero a quién editar', async () => {
    setup([1, 2]);
    expect(screen.getByText('¿A quién quieres editar?')).toBeVisible();
    fireEvent.click(await screen.findByRole('button', { name: 'Ana' }));
    expect(screen.getByRole('heading', { name: 'Editar: Ana' })).toBeVisible();
    expect(mock.calls).toContainEqual({ table: 'people', method: 'in', args: ['id', [1, 2]] });
  });

  it('no cierra si la actualización no afecta filas (permisos)', async () => {
    setup([1]);
    await screen.findByRole('heading', { name: 'Editar: Juan' });
    responses.people = { data: [], error: null };
    save({ person_name: 'Otro' });
    expect(await screen.findByRole('alert')).toHaveTextContent('Error al guardar');
    expect(close).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
  });

  it('muestra el error de carga', async () => {
    responses.people = { data: null, error: { message: 'boom' } };
    setup([1]);
    expect(await screen.findByText(/Error al cargar los datos de la persona|boom/)).toBeVisible();
  });

  it('informa si la persona no existe', async () => {
    responses.people = { data: [], error: null };
    setup([9]);
    expect(await screen.findByText('No se encontró la persona.')).toBeVisible();
  });
});
