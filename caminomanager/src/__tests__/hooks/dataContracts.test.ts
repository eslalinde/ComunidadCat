import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useNationalTeamData } from '@/hooks/useNationalTeamData';
import { useCommunityLeadersReport } from '@/hooks/useCommunityLeadersReport';
import * as options from '@/hooks/useEntityOptions';
import { createQueryHarness, createTableMock, type QueryResponse } from '../helpers/queryHarness';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
let harness: ReturnType<typeof createQueryHarness>;
let mock: ReturnType<typeof createTableMock>;
let responses: Record<string, QueryResponse>;
const ok = (data: unknown, count?: number): QueryResponse => ({ data, error: null, count });
beforeEach(() => {
  harness = createQueryHarness();
  responses = Object.fromEntries(['audit_log', 'people', 'teams', 'belongs', 'communities', 'priests', 'countries', 'states', 'cities', 'city_zones', 'dioceses', 'parishes'].map((name) => [name, ok(null)]));
  mock = createTableMock(responses); db.from.mockReset().mockImplementation(mock.from);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); harness.client.clear(); vi.restoreAllMocks(); });

it('paginación de auditoría, filtros y resolución de nombres nuevos/eliminados', async () => {
  responses.audit_log = ok([
    { id: 1, table_name: 'belongs', new_values: { person_id: 1, team_id: 3 }, old_values: { person_id: 2, team_id: 4 } },
    { id: 2, table_name: 'brothers', new_values: { person_id: 1 }, old_values: null },
    { id: 3, table_name: 'communities', new_values: { person_id: 9 }, old_values: null },
  ], 40);
  responses.people = ok([{ id: 1, person_name: 'Ana' }, { id: 2, person_name: 'Juan' }]);
  responses.teams = ok([{ id: 3, name: 'Responsables' }]);
  const { result } = renderHook(() => useAuditLog(10), { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.entries).toHaveLength(3));
  expect(result.current).toMatchObject({ totalCount: 40, hasMore: true, personNames: { 1: 'Ana', 2: 'Juan' }, teamNames: { 3: 'Responsables' } });
  expect(mock.calls).toContainEqual({ table: 'people', method: 'in', args: ['id', [1, 2]] });
  act(() => result.current.loadMore());
  await waitFor(() => expect(mock.calls).toContainEqual({ table: 'audit_log', method: 'range', args: [0, 39] }));
  act(() => result.current.updateFilters({ table: 'belongs', operation: 'DELETE' }));
  await waitFor(() => expect(mock.calls).toContainEqual({ table: 'audit_log', method: 'eq', args: ['operation', 'DELETE'] }));
  expect(mock.calls.filter((c) => c.method === 'range').at(-1)?.args).toEqual([0, 19]);
});

it('auditoría deshabilitada, vacía, con nombres ausentes y con error', async () => {
  const { result, rerender } = renderHook(({ id, enabled }) => useAuditLog(id, enabled), { wrapper: harness.wrapper, initialProps: { id: 0, enabled: false } });
  expect(db.from).not.toHaveBeenCalled();
  rerender({ id: 10, enabled: true });
  await waitFor(() => expect(result.current.isLoading).toBe(false));
  expect(result.current).toMatchObject({ entries: [], totalCount: 0, hasMore: false, personNames: {}, teamNames: {} });
  responses.audit_log = ok([{ table_name: 'belongs', new_values: { person_id: 1, team_id: 3 } }]);
  act(() => result.current.loadMore());
  await waitFor(() => expect(result.current.entries).toHaveLength(1));
  expect(result.current.personNames).toEqual({});
  responses.audit_log = { data: null, error: { message: 'Sin permiso' } };
  act(() => result.current.loadMore());
  await waitFor(() => expect(result.current.error).toBe('Sin permiso'));
});

it('equipo nacional carga sus miembros y comunidades, y refresca cambios', async () => {
  responses.teams = ok({ id: 3, name: 'Nacional' });
  responses.belongs = ok([{ id: 1, person_id: 2 }]); responses.communities = ok([{ id: 10 }]);
  const { result } = renderHook(useNationalTeamData, { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current).toMatchObject({ team: { id: 3, name: 'Nacional' }, members: [{ id: 1, person_id: 2 }], communities: [{ id: 10 }], error: null });
  expect(mock.calls).toContainEqual({ table: 'teams', method: 'is', args: ['community_id', null] });
  responses.belongs = ok(null); responses.communities = ok(null);
  await act(async () => result.current.refreshTeam());
  await waitFor(() => expect(result.current.members).toEqual([])); expect(result.current.communities).toEqual([]);
});
it.each(['teams', 'belongs', 'communities', 'missing'])('equipo nacional informa fallo en %s', async (table) => {
  responses.teams = ok(table === 'missing' ? null : { id: 3 });
  if (table !== 'missing') responses[table] = { data: null, error: { message: 'Sin conexión' } };
  const { result } = renderHook(useNationalTeamData, { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.error).toBe('Error desconocido');
});

it('opciones aplican filtros significativos, campos personalizados y errores', async () => {
  responses.people = ok([{ id: 1, person_name: 'Ana' }]);
  const { result } = renderHook(() => options.useEntityOptions({ tableName: 'people', labelField: 'person_name', filters: { id: { not: 2 }, active: false, rank: 0, empty: '', nil: null, absent: undefined } }), { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.options).toEqual([{ value: 1, label: 'Ana' }]));
  expect(mock.calls).toContainEqual({ table: 'people', method: 'neq', args: ['id', 2] });
  expect(mock.calls).toContainEqual({ table: 'people', method: 'eq', args: ['active', false] });
  expect(mock.calls.some((c) => c.args[0] === 'empty')).toBe(false);
  responses.people = { data: null, error: { message: 'Sin permiso' } };
  await act(async () => { await result.current.refetch(); });
  await waitFor(() => expect(result.current.error).toBe('Sin permiso'));
});
it('opciones dependientes consultan las tablas y alcances correctos', async () => {
  const { result, rerender } = renderHook(({ scoped }) => ({
    country: options.useCountryOptions(), state: options.useStateOptions(scoped ? 1 : undefined),
    city: options.useCityOptions(scoped ? 1 : undefined, scoped ? 2 : undefined),
    zone: options.useZoneOptions(scoped ? 3 : undefined), allCities: options.useAllCityOptions(),
    diocese: options.useDioceseOptions(), parish: options.useParishOptions(scoped ? 3 : undefined),
    allParishes: options.useAllParishOptions(), people: options.usePeopleOptions(scoped ? 9 : undefined),
  }), { wrapper: harness.wrapper, initialProps: { scoped: false } });
  await waitFor(() => expect(Object.values(result.current).every((q) => !q.loading)).toBe(true));
  rerender({ scoped: true });
  await waitFor(() => expect(mock.calls).toContainEqual({ table: 'people', method: 'neq', args: ['id', 9] }));
  for (const [table, key, value] of [['states', 'country_id', 1], ['cities', 'state_id', 2], ['city_zones', 'city_id', 3], ['parishes', 'city_id', 3]]) {
    expect(mock.calls).toContainEqual({ table, method: 'eq', args: [key, value] });
  }
});
it('etiquetas de catequistas combinan responsables y parroquias y toleran relaciones vacías', async () => {
  responses.teams = ok([{ id: 1, name: 'A', belongs: [{ person: { person_name: 'Ana' } }, { person: null }], parish_teams: [{ parish: { name: 'Parroquia' } }, { parish: null }] }, { id: 2, name: 'Sin miembros' }]);
  const { result } = renderHook(options.useCathechistTeamOptions, { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.options).toEqual([{ value: 1, label: 'Ana - Parroquia' }, { value: 2, label: 'Sin miembros' }]));
  responses.teams = ok(null); await act(async () => { await result.current.refetch(); });
  await waitFor(() => expect(result.current.options).toEqual([]));
  responses.teams = { data: null, error: { message: 'Error' } }; await act(async () => { await result.current.refetch(); });
  await waitFor(() => expect(result.current.error).toBe('Error'));
});

it('reporte de líderes clasifica vocaciones y resuelve responsables y presbíteros por parroquia', async () => {
  responses.communities = ok([{ id: 10, number: '1', parish: { id: 20, name: 'Parroquia', diocese: { type: 'archdiocese', name: 'Medellín' } }, step_way: { name: 'Inicio', order_num: 1 }, cathechist_team: { name: 'Catequistas', belongs: [{ person: null }, { is_responsible_for_the_team: true, person: { person_name: 'Ana' } }] }, teams: [{ team_type_id: 1 }, { team_type_id: 2, belongs: [{ person: { person_name: 'Juan' } }, { person: null }] }, { team_type_id: 2 }], brothers: [{ person: { person_name: 'Seminarista', person_type_id: 4 } }, { person: { person_name: 'Religiosa', person_type_id: 6 } }, { person: { person_name: 'Itinerante', person_type_id: 2, is_itinerante: true } }, { person: null }] }, { id: 11, number: '2', parish: { id: 21, diocese: { type: 'diocese', name: 'Caldas' } } }, { id: 12, number: '3' }]);
  responses.priests = ok([{ parish_id: 20, person: { person_name: 'Pedro' } }, { parish_id: 20, person: { person_name: 'Pablo' } }, { parish_id: null, person: null }]);
  const { result } = renderHook(useCommunityLeadersReport, { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.data).toHaveLength(3));
  expect(result.current.data[0]).toMatchObject({ responsible_name: 'Ana', catechist_count: 1, presbyters: 'Pedro, Pablo', presbyter_count: 2, itinerants: 'Juan, Itinerante', itinerant_count: 2, seminarians: 'Seminarista', nuns: 'Religiosa', brothers_count: 4 });
  expect(result.current.data[1].diocese_name).toBe('Diócesis de Caldas');
  expect(result.current.data[2]).toMatchObject({ diocese_name: 'N/A', responsible_name: 'Sin asignar', brothers_count: 0 });
});
it.each(['empty', 'communities', 'priests'])('reporte de líderes: %s', async (table) => {
  if (table !== 'empty') responses[table] = { data: null, error: { message: 'Sin permiso' } };
  const { result } = renderHook(useCommunityLeadersReport, { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current.data).toEqual([]);
  expect(result.current.error?.message ?? null).toBe(table === 'empty' ? null : 'Sin permiso');
});
