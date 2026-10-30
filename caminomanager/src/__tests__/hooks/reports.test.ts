import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCatechistTeamsReport } from '@/hooks/useCatechistTeamsReport';
import { useParishCatechesisReport } from '@/hooks/useParishCatechesisReport';
import { usePriestsReport } from '@/hooks/usePriestsReport';
import { createQueryHarness, createTableMock, type QueryResponse } from '../helpers/queryHarness';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
let harness: ReturnType<typeof createQueryHarness>;
let mock: ReturnType<typeof createTableMock>;
let responses: Record<string, QueryResponse>;
const ok = (data: unknown): QueryResponse => ({ data, error: null });
beforeEach(() => {
  harness = createQueryHarness();
  responses = { teams: ok(null), parish_teams: ok(null), parish_catechesis: ok(null), priests: ok(null), communities: ok(null) };
  mock = createTableMock(responses);
  db.from.mockReset().mockImplementation(mock.from);
});
afterEach(() => { cleanup(); harness.client.clear(); });

describe('reportes con relaciones y transformaciones reales', () => {
  it('produce una fila por parroquia llevada y selecciona el responsable del equipo', async () => {
    responses.teams = ok([
      { id: 1, community: { number: '3', parish: { name: 'Origen', diocese: { type: 'archdiocese', name: 'Medellín' } } }, belongs: [{ is_responsible_for_the_team: false, person: { person_name: 'Otro' } }, { is_responsible_for_the_team: true, person: { person_name: 'Ana' } }] },
      { id: 2, community: { number: '4', parish: { name: 'Otra', diocese: { type: 'diocese', name: 'Caldas' } } }, belongs: [] },
      { id: 3, community: null },
    ]);
    responses.parish_teams = ok([{ team_id: 1, parish: { name: 'A' } }, { team_id: 1, parish: { name: 'B' } }, { team_id: 2, parish: null }]);
    const { result } = renderHook(useCatechistTeamsReport, { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([
      { community_number: '3', parish_name: 'Origen', diocese_name: 'Arquidiócesis de Medellín', responsible_name: 'Ana', has_parish_llevan: 'Sí', parish_llevan: 'A' },
      { community_number: '3', parish_name: 'Origen', diocese_name: 'Arquidiócesis de Medellín', responsible_name: 'Ana', has_parish_llevan: 'Sí', parish_llevan: 'B' },
      { community_number: '4', parish_name: 'Otra', diocese_name: 'Diócesis de Caldas', responsible_name: 'Sin asignar', has_parish_llevan: 'No', parish_llevan: '' },
      { community_number: 'N/A', parish_name: 'N/A', diocese_name: 'N/A', responsible_name: 'Sin asignar', has_parish_llevan: 'No', parish_llevan: '' },
    ]);
    expect(mock.calls).toContainEqual({ table: 'teams', method: 'eq', args: ['team_type_id', 3] });
    expect(mock.calls).toContainEqual({ table: 'teams', method: 'not', args: ['community_id', 'is', null] });
  });

  it('cuenta comunidades por parroquia y conserva presbíteros sin asignación', async () => {
    responses.priests = ok([
      { parish_id: 10, is_parish_priest: true, person: { person_name: 'Juan', phone: '1', mobile: '2', email: 'juan@test.local' }, parish: { name: 'A', diocese: { name: 'Diócesis' }, city: { name: 'Ciudad' } } },
      { parish_id: null, is_parish_priest: false, person: null, parish: null },
      { parish_id: 20, is_parish_priest: false, person: { person_name: 'Pedro' }, parish: { name: 'B' } },
    ]);
    responses.communities = ok([{ parish_id: 10 }, { parish_id: 10 }, { parish_id: null }]);
    const { result } = renderHook(usePriestsReport, { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data[0]).toEqual({ priest_name: 'Juan', is_parish_priest: 'Sí', parish_name: 'A', diocese: 'Diócesis', city_name: 'Ciudad', communities_count: 2, phone: '1', mobile: '2', email: 'juan@test.local' });
    expect(result.current.data[1]).toMatchObject({ priest_name: 'N/A', is_parish_priest: 'No', parish_name: 'Sin parroquia asignada', communities_count: 0, phone: '-', email: '-' });
    expect(result.current.data[2].communities_count).toBe(0);
  });

  it('filtra catequesis por fechas inclusivas y separa la caché por periodo', async () => {
    responses.parish_catechesis = ok([
      { planned_start_date: '2026-10-01', actual_start_date: '2026-10-02', birth_retreat_date: '2026-11-01', attendance_count: 42, catechist_team: 'Equipo', parish: { name: 'Parroquia', diocese: { type: 'archdiocese', name: 'Bogotá' }, city: { name: 'Ciudad' }, zone: { name: 'Zona' } } },
      { parish: { diocese: { type: 'diocese', name: 'Caldas' } } },
      { parish: null },
    ]);
    const { result, rerender } = renderHook(({ start, end }) => useParishCatechesisReport(start, end), { wrapper: harness.wrapper, initialProps: { start: '2026-10-01', end: '2026-10-31' } });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data[0]).toMatchObject({ diocese_name: 'Arquidiócesis de Bogotá', attendance_count: 42, catechist_team: 'Equipo', zone_name: 'Zona' });
    expect(result.current.data[1].diocese_name).toBe('Diócesis de Caldas');
    expect(result.current.data[2]).toEqual({ diocese_name: 'N/A', parish_name: 'N/A', city_name: 'N/A', zone_name: 'N/A', planned_start_date: '', actual_start_date: '', birth_retreat_date: '', attendance_count: 0, catechist_team: '' });
    expect(mock.calls).toContainEqual({ table: 'parish_catechesis', method: 'gte', args: ['planned_start_date', '2026-10-01'] });
    expect(mock.calls).toContainEqual({ table: 'parish_catechesis', method: 'lte', args: ['planned_start_date', '2026-10-31'] });
    responses.parish_catechesis = ok([]);
    rerender({ start: '2026-11-01', end: '2026-11-30' });
    await waitFor(() => expect(result.current.data).toEqual([]));
    expect(harness.client.getQueryData(['report', 'parish-catechesis', '2026-10-01', '2026-10-31'])).toHaveLength(3);
  });

  it.each([
    ['catequistas', useCatechistTeamsReport], ['presbíteros', usePriestsReport],
    ['catequesis', () => useParishCatechesisReport('2026-10-01', '2026-10-31')],
  ] as const)('normaliza reporte vacío: %s', async (_name, hook) => {
    const { result } = renderHook<{ data: unknown[]; loading: boolean; error: Error | null }, void>(hook, { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it.each([
    ['teams', useCatechistTeamsReport], ['parish_teams', useCatechistTeamsReport],
    ['priests', usePriestsReport], ['communities', usePriestsReport],
    ['parish_catechesis', () => useParishCatechesisReport('2026-10-01', '2026-10-31')],
  ] as const)('propaga errores en %s', async (table, hook) => {
    responses.teams = ok([{ id: 1 }]);
    responses[table] = { data: null, error: { message: 'No se pudo cargar' } };
    const { result } = renderHook<{ data: unknown[]; loading: boolean; error: Error | null }, void>(hook, { wrapper: harness.wrapper });
    await waitFor(() => expect(result.current.error).toEqual({ message: 'No se pudo cargar' }));
    expect(result.current.data).toEqual([]);
  });
});
