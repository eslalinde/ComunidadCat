import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamSection } from '@/components/crud/TeamSection';
import { DeleteDouble } from '../helpers/modalDoubles';
import { createTableMock, type QueryResponse } from '../helpers/queryHarness';
import type { Belongs, Team } from '@/types/database';
import { toast } from 'sonner';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock('@/components/crud/ConfirmDeleteDialog', () => ({ ConfirmDeleteDialog: (p: Parameters<typeof DeleteDouble>[0]) => <DeleteDouble {...p} /> }));
const team: Team = { id: 8, name: 'Equipo nacional', team_type_id: 3, community_id: 10 };
const members: Belongs[] = [
  { id: 11, person_id: 1, team_id: 8, community_id: 10, is_responsible_for_the_team: true, created_at: new Date().toISOString(), person: { id: 1, person_name: 'Juan', spouse_id: 2, gender_id: 1, person_type_id: 1 } },
  { id: 12, person_id: 2, team_id: 8, community_id: 10, is_responsible_for_the_team: false, created_at: '2020-01-01', person: { id: 2, person_name: 'Ana', spouse_id: 1, gender_id: 2, mobile: '300', person_type_id: 1 } },
  { id: 13, person_id: 3, team_id: 8, community_id: 10, is_responsible_for_the_team: false, person: { id: 3, person_name: 'Pedro', person_type_id: 3 } },
  { person_id: 4, team_id: 8, community_id: null, is_responsible_for_the_team: false },
];
let responses: Record<string, QueryResponse>;
let mock: ReturnType<typeof createTableMock>;
const refresh = vi.fn(), add = vi.fn(), edit = vi.fn();
function setup(overrides: Partial<React.ComponentProps<typeof TeamSection>> = {}) {
  return render(<TeamSection team={team} members={members} parishes={[{ id: 5, name: 'San José', city_id: 1 }]} communityId={10} onDelete={refresh} onAddMember={add} onEditMember={edit} {...overrides} />);
}
beforeEach(() => {
  vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {});
  responses = Object.fromEntries(['belongs', 'parish_teams', 'teams'].map((t) => [t, { data: [], error: null, count: 1 }]));
  mock = createTableMock(responses); db.from.mockImplementation(mock.from);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe('TeamSection', () => {
  it('agrupa matrimonio, ordena responsables, enlaza parroquias y respeta permisos', () => {
    const view = setup({ teamNumber: 2 });
    expect(screen.getByText('Equipo de Catequistas 2')).toBeVisible();
    expect(screen.getAllByText('Juan y Ana')).toHaveLength(1);
    expect(screen.getByText('300')).toBeVisible();
    expect(screen.getByRole('link', { name: 'San José' })).toHaveAttribute('href', '/parroquias/detalle?id=5');
    expect(screen.getByTitle(/Ya existe un responsable/)).toBeDisabled();
    fireEvent.click(screen.getByTitle('Agregar miembro al equipo')); expect(add).toHaveBeenCalledOnce();
    fireEvent.click(screen.getAllByTitle('Editar persona')[0]); expect(edit).toHaveBeenCalledWith(1);
    view.rerender(<TeamSection team={{ ...team, team_type_id: 4 }} members={members} parishes={[]} communityId={10} />);
    expect(screen.getByText('Equipo de Responsables')).toBeVisible();
    expect(screen.queryByTitle('Eliminar equipo completo')).not.toBeInTheDocument();
  });
  it('muestra carga y equipos vacíos', () => {
    const view = setup({ loading: true }); expect(screen.getByText('Cargando equipo...')).toBeVisible();
    view.rerender(<TeamSection team={{ ...team, team_type_id: 1 }} members={[]} parishes={[]} communityId={null} />);
    expect(screen.getByText('Equipo nacional')).toBeVisible(); expect(screen.getByText('No hay miembros en este equipo')).toBeVisible();
  });
  it.each(['ok', 'error', 'zero'])('elimina las dos relaciones del matrimonio: %s', async (scenario) => {
    setup(); fireEvent.click(screen.getAllByTitle('Eliminar miembro del equipo')[0]);
    fireEvent.click(screen.getByText('Cancelar borrado')); expect(db.from).not.toHaveBeenCalled();
    fireEvent.click(screen.getAllByTitle('Eliminar miembro del equipo')[0]);
    if (scenario === 'error') responses.belongs.error = { message: 'denied' };
    if (scenario === 'zero') responses.belongs.count = 0;
    fireEvent.click(screen.getByText('Confirmar borrado'));
    await waitFor(() => expect(scenario === 'ok' ? toast.success : toast.error).toHaveBeenCalled());
    expect(mock.calls).toContainEqual({ table: 'belongs', method: 'in', args: ['id', [11, 12]] });
    expect(refresh).toHaveBeenCalledTimes(scenario === 'ok' ? 1 : 0);
  });
  it.each([true, false])('quita responsabilidad y maneja errores=%s', async (fails) => {
    setup(); fireEvent.click(screen.getByTitle(/Quitar responsabilidad/));
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    fireEvent.click(screen.getByTitle(/Quitar responsabilidad/));
    if (fails) responses.belongs.error = { message: 'denied' };
    fireEvent.click(screen.getByRole('button', { name: 'Quitar Responsabilidad' }));
    await waitFor(() => expect(fails ? toast.error : toast.success).toHaveBeenCalled());
    expect(mock.calls.filter((c) => c.method === 'update')).toHaveLength(fails ? 1 : 2);
    expect(mock.calls).toContainEqual({ table: 'belongs', method: 'update', args: [{ is_responsible_for_the_team: false }] });
    expect(refresh).toHaveBeenCalledTimes(fails ? 0 : 1);
  });
  it.each([true, false])('asigna responsabilidad al matrimonio y maneja errores=%s', async (fails) => {
    setup({ members: members.slice(0, 2).map((m) => ({ ...m, is_responsible_for_the_team: false })) });
    fireEvent.click(screen.getByTitle('Asignar responsabilidad')); fireEvent.click(screen.getByText('Cancelar'));
    fireEvent.click(screen.getByTitle('Asignar responsabilidad'));
    if (fails) responses.belongs.error = { message: 'denied' };
    fireEvent.click(screen.getByRole('button', { name: 'Asignar Responsabilidad' }));
    await waitFor(() => expect(fails ? toast.error : toast.success).toHaveBeenCalled());
    expect(mock.calls.filter((c) => c.method === 'update')).toHaveLength(fails ? 1 : 2);
    expect(mock.calls).toContainEqual({ table: 'belongs', method: 'update', args: [{ is_responsible_for_the_team: true }] });
  });
  it.each(['ok', 'belongs', 'parish_teams', 'teams', 'zero'])('borra equipo en orden y detiene errores en %s', async (scenario) => {
    setup(); fireEvent.click(screen.getByTitle('Eliminar equipo completo')); fireEvent.click(screen.getByText('Cancelar borrado'));
    fireEvent.click(screen.getByTitle('Eliminar equipo completo'));
    if (responses[scenario]) responses[scenario].error = { message: 'denied' };
    if (scenario === 'zero') responses.teams.count = 0;
    fireEvent.click(screen.getByText('Confirmar borrado'));
    await waitFor(() => expect(scenario === 'ok' ? toast.success : toast.error).toHaveBeenCalled());
    const tables = db.from.mock.calls.map(([tableName]) => tableName);
    expect(tables).toEqual(scenario === 'belongs' ? ['belongs'] : scenario === 'parish_teams' ? ['belongs', 'parish_teams'] : ['belongs', 'parish_teams', 'teams']);
    expect(refresh).toHaveBeenCalledTimes(scenario === 'ok' ? 1 : 0);
  });
});
