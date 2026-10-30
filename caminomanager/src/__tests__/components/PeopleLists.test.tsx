import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BrothersList } from '@/components/crud/BrothersList';
import { PriestsList } from '@/components/crud/PriestsList';
import { DeleteDouble, FormDouble } from '../helpers/modalDoubles';
import { createTableMock, type QueryResponse } from '../helpers/queryHarness';
import type { MergedBrother } from '@/hooks/useCommunityData';
import type { Priest } from '@/types/database';
import { toast } from 'sonner';
const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/components/crud/ConfirmDeleteDialog', () => ({ ConfirmDeleteDialog: (p: Parameters<typeof DeleteDouble>[0]) => <DeleteDouble {...p} /> }));
vi.mock('@/components/crud/DynamicEntityModal', () => ({ DynamicEntityModal: (p: Parameters<typeof FormDouble>[0]) => <FormDouble {...p} /> }));
interface SelectionProps { open: boolean; onClose: () => void; onSelect: (id: number, role: boolean) => Promise<void> }
function Selection({ open, onClose, onSelect }: SelectionProps) { return open ? <><button onClick={() => { void onSelect(42, true).catch(() => toast.error('Error de selección')); }}>Seleccionar persona</button><button onClick={onClose}>Cerrar selección</button></> : null; }
vi.mock('@/components/crud/SelectBrotherModal', () => ({ SelectBrotherModal: (p: SelectionProps) => <Selection {...p} /> }));
vi.mock('@/components/crud/SelectPriestModal', () => ({ SelectPriestModal: (p: SelectionProps) => <Selection {...p} /> }));
vi.mock('@/components/crud/MarriageModal', () => ({ MarriageModal: ({ open, onSuccess, onClose }: { open: boolean; onSuccess: (a?: number, b?: number) => void; onClose: () => void }) => open ? <><button onClick={() => onSuccess(42, 43)}>Matrimonio creado</button><button onClick={() => onSuccess()}>Sin identificadores</button><button onClick={onClose}>Cerrar matrimonio</button></> : null }));
vi.mock('@/components/bulk-upload/BulkUploadWizard', () => ({ BulkUploadWizard: ({ open, onClose, onComplete }: { open: boolean; onClose: () => void; onComplete: () => void }) => open ? <><button onClick={onComplete}>Carga terminada</button><button onClick={onClose}>Cerrar carga</button></> : null }));
const refresh = vi.fn(); let responses: Record<string, QueryResponse>; let mock: ReturnType<typeof createTableMock>;
beforeEach(() => { vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}); responses = { people: { data: { id: 42 }, error: null }, brothers: { data: [], error: null }, priests: { data: [], error: null, count: 1 } }; mock = createTableMock(responses); db.from.mockImplementation(mock.from); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const base: MergedBrother = { id: 'm', name: 'Juan y Ana', personIds: [1, 2], carisma: 'Matrimonio', celular: '300', isMarriage: true, isItinerante: false, isPresbitero: false, createdAt: new Date().toISOString() };
function brothers(overrides: Partial<React.ComponentProps<typeof BrothersList>> = {}) { return render(<BrothersList brothers={[base]} communityId={10} teamMembers={{}} onAdd={refresh} onDelete={refresh} {...overrides} />); }
function menu(item: string) { fireEvent.keyDown(screen.getByRole('button', { name: /Agregar Nuevo/ }), { key: 'Enter' }); fireEvent.click(screen.getByRole('menuitem', { name: item })); }
describe('BrothersList', () => {
  it('agrupa, ordena, colapsa y protege hermanos asociados a equipos', () => {
    const view = brothers({ brothers: [base, { ...base, id: 's', name: 'Pedro', personIds: [3], carisma: 'Presbítero', isMarriage: false }, { ...base, id: 'u', name: 'Otro', personIds: [4], carisma: '' }], teamMembers: { 1: [{ person_id: 1, community_id: 10, team_id: 1, is_responsible_for_the_team: true }] } });
    expect(screen.getByTitle(/Este hermano está asociado/)).toBeDisabled();
    fireEvent.click(screen.getByText('Matrimonio')); expect(screen.queryByText('Juan y Ana')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Matrimonio')); expect(screen.getByText('Juan y Ana')).toBeVisible();
    view.rerender(<BrothersList brothers={[]} communityId={10} teamMembers={{}} loading />); expect(screen.getByText('Cargando hermanos...')).toBeVisible();
    view.rerender(<BrothersList brothers={[]} communityId={10} teamMembers={{}} />); expect(screen.queryByText('Agregar Existente')).not.toBeInTheDocument(); expect(screen.getByText(/No hay hermanos/)).toBeVisible();
  });
  it.each([false, true])('borra vínculos del matrimonio, error=%s', async (fails) => {
    brothers(); fireEvent.click(screen.getByTitle('Eliminar hermano de la comunidad')); fireEvent.click(screen.getByText('Cancelar borrado'));
    fireEvent.click(screen.getByTitle('Eliminar hermano de la comunidad')); if (fails) responses.brothers.error = { message: 'denied' };
    fireEvent.click(screen.getByText('Confirmar borrado')); await waitFor(() => expect(fails ? toast.error : toast.success).toHaveBeenCalled());
    expect(mock.calls.filter((c) => c.method === 'delete')).toHaveLength(fails ? 1 : 2); expect(refresh).toHaveBeenCalledTimes(fails ? 0 : 1);
    expect(mock.calls).toContainEqual({ table: 'brothers', method: 'eq', args: ['community_id', 10] });
  });
  it.each([false, true])('agrega persona existente, error=%s', async (fails) => {
    brothers(); fireEvent.click(screen.getByText('Agregar Existente')); if (fails) responses.brothers.error = { message: 'denied' };
    fireEvent.click(screen.getByText('Seleccionar persona')); await waitFor(() => expect(fails ? toast.error : refresh).toHaveBeenCalled());
    expect(mock.calls).toContainEqual({ table: 'brothers', method: 'insert', args: [{ person_id: 42, community_id: 10 }] }); fireEvent.click(screen.getByText('Cerrar selección'));
  });
  it.each(['ok', 'people', 'brothers'])('crea persona y relación, error=%s', async (scenario) => {
    brothers(); menu('Hermano individual'); if (responses[scenario]) responses[scenario].error = { message: 'denied' };
    fireEvent.change(screen.getByLabelText('Datos del formulario'), { target: { value: JSON.stringify({ person_name: 'Nuevo' }) } }); fireEvent.click(screen.getByText('Guardar formulario'));
    await waitFor(() => expect(scenario === 'ok' ? toast.success : toast.error).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalledTimes(scenario === 'ok' ? 1 : 0); expect(db.from).toHaveBeenCalledTimes(scenario === 'people' ? 1 : 2);
    fireEvent.click(screen.getByText('Cerrar formulario'));
  });
  it.each([false, true])('añade ambos cónyuges tras crearlos, error=%s', async (fails) => {
    brothers(); menu('Matrimonio'); fireEvent.click(screen.getByText('Sin identificadores')); expect(db.from).not.toHaveBeenCalled();
    if (fails) responses.brothers.error = { message: 'denied' }; fireEvent.click(screen.getByText('Matrimonio creado'));
    await waitFor(() => expect(fails ? toast.error : refresh).toHaveBeenCalled());
    expect(mock.calls).toContainEqual({ table: 'brothers', method: 'insert', args: [[{ person_id: 42, community_id: 10 }, { person_id: 43, community_id: 10 }]] }); fireEvent.click(screen.getByText('Cerrar matrimonio'));
  });
  it('refresca al completar carga masiva', () => { brothers(); fireEvent.click(screen.getByText('Carga Masiva')); fireEvent.click(screen.getByText('Carga terminada')); expect(refresh).toHaveBeenCalledOnce(); });
});
const priest: Priest = { id: 1, person_id: 7, parish_id: 10, is_parish_priest: false, person: { id: 7, person_name: 'Padre Juan', phone: '123', mobile: '300', email: 'p@example.com' } };
function priests(overrides: Partial<React.ComponentProps<typeof PriestsList>> = {}) { return render(<PriestsList priests={[priest]} parishId={10} onRefresh={refresh} {...overrides} />); }
describe('PriestsList', () => {
  it.each(['ok', 'error', 'zero'])('quita relación parroquial, resultado=%s', async (scenario) => {
    priests(); fireEvent.click(screen.getByTitle('Remover sacerdote')); fireEvent.click(screen.getByText('Cancelar borrado')); fireEvent.click(screen.getByTitle('Remover sacerdote'));
    if (scenario === 'error') responses.priests.error = { message: 'denied' }; if (scenario === 'zero') responses.priests.count = 0;
    fireEvent.click(screen.getByText('Confirmar borrado')); await waitFor(() => expect(scenario === 'ok' ? toast.success : toast.error).toHaveBeenCalled());
    expect(refresh).toHaveBeenCalledTimes(scenario === 'ok' ? 1 : 0); expect(db.from).not.toHaveBeenCalledWith('people');
  });
  it.each([false, true])('cambia rol, error=%s', async (fails) => {
    priests(); if (fails) responses.priests.error = { message: 'denied' }; fireEvent.click(screen.getByTitle('Clic para cambiar rol'));
    await waitFor(() => expect(fails ? toast.error : toast.success).toHaveBeenCalled()); expect(mock.calls).toContainEqual({ table: 'priests', method: 'update', args: [{ is_parish_priest: true }] });
  });
  it.each([false, true])('asigna sacerdote existente, error=%s', async (fails) => {
    priests(); fireEvent.click(screen.getByTitle('Asignar sacerdote existente')); if (fails) responses.priests.error = { message: 'denied' };
    fireEvent.click(screen.getByText('Seleccionar persona')); await waitFor(() => expect(fails ? toast.error : refresh).toHaveBeenCalled());
    expect(mock.calls).toContainEqual({ table: 'priests', method: 'insert', args: [{ person_id: 42, parish_id: 10, is_parish_priest: true }] }); fireEvent.click(screen.getByText('Cerrar selección'));
  });
  it.each([false, true])('guarda formulario de sacerdote, edición=%s', async (editing) => {
    priests(); fireEvent.click(screen.getByTitle(editing ? 'Editar sacerdote' : 'Nuevo sacerdote'));
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: '  Padre Nuevo  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Parroco' })); fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(mock.calls).toContainEqual({ table: 'people', method: editing ? 'update' : 'insert', args: [expect.objectContaining({ person_name: 'Padre Nuevo' })] });
    expect(mock.calls).toContainEqual({ table: 'priests', method: editing ? 'update' : 'insert', args: [expect.objectContaining({ is_parish_priest: true })] });
  });
  it.each(['people', 'priests'])('conserva formulario ante fallo de %s', async (table) => {
    priests(); fireEvent.click(screen.getByTitle('Nuevo sacerdote')); responses[table].error = { message: 'denied' };
    fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: 'Padre Nuevo' } }); fireEvent.click(screen.getByText('Guardar'));
    await waitFor(() => expect(toast.error).toHaveBeenCalled()); expect(refresh).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Cancelar'));
  });
  it('valida nombre y muestra carga y ausencia de sacerdotes', async () => {
    const view = priests(); fireEvent.click(screen.getByTitle('Nuevo sacerdote')); fireEvent.click(screen.getByText('Guardar')); await screen.findByText('El nombre es requerido'); expect(db.from).not.toHaveBeenCalled(); fireEvent.click(screen.getByText('Cancelar'));
    view.rerender(<PriestsList priests={[]} parishId={10} loading />); expect(screen.getByText('Sacerdotes')).toBeVisible(); expect(screen.queryByTitle('Nuevo sacerdote')).not.toBeInTheDocument();
    view.rerender(<PriestsList priests={[]} parishId={10} />); expect(screen.getByText(/No hay sacerdotes/)).toBeVisible();
  });
});
