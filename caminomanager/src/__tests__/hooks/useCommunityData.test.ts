import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommunityData } from '@/hooks/useCommunityData';
import { queryKeys } from '@/lib/queryKeys';
import type { Brother, Person } from '@/types/database';
import { createQueryHarness, createTableMock, type QueryResponse } from '../helpers/queryHarness';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
let harness: ReturnType<typeof createQueryHarness>;
let mock: ReturnType<typeof createTableMock>;
let responses: Record<string, QueryResponse>;
const ok = (data: unknown): QueryResponse => ({ data, error: null });
const person = (id: number, person_name: string, overrides: Partial<Person> = {}): Person => ({ id, person_name, person_type_id: 1, ...overrides });
const brother = (person: Person, created_at?: string): Brother => ({ id: person.id, person_id: person.id!, community_id: 10, person, created_at });

beforeEach(() => {
  harness = createQueryHarness();
  responses = {
    communities: ok({ id: 10, number: '1', parish_id: 20 }), brothers: ok([]),
    teams: ok([{ id: 30, team_type_id: 4 }, { id: 40, team_type_id: 3 }, { id: 50, team_type_id: 1 }]),
    belongs: ok([{ id: 1, team_id: 30 }, { id: 2, team_id: 30 }, { id: 3, team_id: 40 }]),
    parish_teams: ok([{ team_id: 40, parish: { id: 20, name: 'Parroquia' } }, { team_id: 40, parish: null }]),
    community_step_log: ok([{ id: 1, community_id: 10 }]), priests: ok({ person: { person_name: 'Presbítero' } }),
  };
  mock = createTableMock(responses);
  db.from.mockReset().mockImplementation(mock.from);
});
afterEach(() => { cleanup(); harness.client.clear(); vi.restoreAllMocks(); });
const setup = (id = 10) => renderHook(() => useCommunityData(id), { wrapper: harness.wrapper });

describe('detalle de comunidad', () => {
  it('espera identificadores antes de consultar relaciones y agrupa equipos y parroquias', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.parishPriestName).toBe('Presbítero'));
    await waitFor(() => expect(result.current.teamMembers[30]).toHaveLength(2));
    expect(result.current.teams).toEqual({ responsables: [{ id: 30, team_type_id: 4 }], catequistas: [{ id: 40, team_type_id: 3 }] });
    expect(result.current.teamParishes).toEqual({ 40: [{ id: 20, name: 'Parroquia' }] });
    expect(mock.calls).toContainEqual({ table: 'belongs', method: 'in', args: ['team_id', [30, 40, 50]] });
    expect(mock.calls).toContainEqual({ table: 'priests', method: 'eq', args: ['parish_id', 20] });
    expect(mock.calls).toContainEqual({ table: 'community_step_log', method: 'order', args: ['id', { ascending: false }] });
  });

  it('no consulta sin comunidad y normaliza listas ausentes', async () => {
    const disabled = setup(0);
    expect(db.from).not.toHaveBeenCalled();
    disabled.unmount();
    for (const table of Object.keys(responses)) responses[table] = ok(null);
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current).toMatchObject({ community: null, brothers: [], teams: { responsables: [], catequistas: [] }, teamMembers: {}, teamParishes: {}, stepLogs: [], mergedBrothers: [], parishPriestName: null });
    expect(db.from).not.toHaveBeenCalledWith('belongs');
    expect(db.from).not.toHaveBeenCalledWith('priests');
  });

  it.each(['communities', 'brothers', 'teams', 'community_step_log', 'belongs', 'parish_teams'])('propaga errores de %s', async (table) => {
    responses[table] = { data: null, error: { message: `Error ${table}` } };
    const { result } = setup();
    await waitFor(() => expect(result.current.error).toBe(`Error ${table}`));
  });

  it.each([false, true])('une matrimonios una sola vez, incluso con esposa primero=%s', async (wifeFirst) => {
    const husband = brother(person(1, 'Juan', { spouse_id: 2, gender_id: 1, mobile: '111' }), '2026-10-01');
    const wife = brother(person(2, 'Ana', { spouse_id: 1, gender_id: 2, is_itinerante: true }), '2026-10-20');
    responses.brothers = ok(wifeFirst ? [wife, husband] : [husband, wife]);
    const { result } = setup();
    await waitFor(() => expect(result.current.mergedBrothers).toHaveLength(1));
    expect(result.current.mergedBrothers[0]).toMatchObject({ name: 'Juan y Ana', carisma: 'Matrimonio', celular: '111', isMarriage: true, isItinerante: true, isPresbitero: false, createdAt: '2026-10-20' });
    expect(result.current.mergedBrothers[0].personIds.sort()).toEqual([1, 2]);
  });

  it('usa fecha y celular disponibles en el matrimonio', async () => {
    responses.brothers = ok([
      brother(person(1, 'Juan', { spouse_id: 2, gender_id: 1 })),
      brother(person(2, 'Ana', { spouse_id: 1, gender_id: 2, mobile: '222' }), '2026-10-20'),
    ]);
    const { result } = setup();
    await waitFor(() => expect(result.current.mergedBrothers).toHaveLength(1));
    expect(result.current.mergedBrothers[0]).toMatchObject({ celular: '222', createdAt: '2026-10-20', isItinerante: false });
  });

  it('conserva solteros y vocaciones sin unirlos por referencias antiguas de cónyuge', async () => {
    responses.brothers = ok([
      brother(person(1, 'Juan', { spouse_id: 2, gender_id: 1 })),
      brother(person(2, 'Presbítero', { spouse_id: 1, person_type_id: 3 })),
      brother(person(3, 'Soltera', { person_type_id: 2, spouse_id: 99 })),
      { id: 9, person_id: 9, community_id: 10, person: null },
    ]);
    const { result } = setup();
    await waitFor(() => expect(result.current.mergedBrothers).toHaveLength(3));
    expect(result.current.mergedBrothers.every((b) => !b.isMarriage)).toBe(true);
    expect(result.current.mergedBrothers[1]).toMatchObject({ isPresbitero: true, carisma: 'Presbítero', createdAt: null });
    expect(result.current.mergedBrothers[2]).toMatchObject({ name: 'Soltera', carisma: 'Soltero/a' });
  });

  it('invalida solo el recurso solicitado y permite recargar toda la comunidad', async () => {
    const invalidate = vi.spyOn(harness.client, 'invalidateQueries');
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    const operations = [
      [result.current.invalidateDetail, queryKeys.community.detail(10)],
      [result.current.invalidateBrothers, queryKeys.community.brothers(10)],
      [result.current.invalidateTeams, queryKeys.community.teams(10)],
      [result.current.invalidateTeamMembers, queryKeys.community.teamMembers(10)],
      [result.current.invalidateStepLogs, queryKeys.community.stepLogs(10)],
      [result.current.refreshCommunity, queryKeys.community.all],
    ] as const;
    for (const [operation, queryKey] of operations) {
      await act(async () => { await operation(); });
      expect(invalidate).toHaveBeenLastCalledWith({ queryKey });
    }
  });
});
