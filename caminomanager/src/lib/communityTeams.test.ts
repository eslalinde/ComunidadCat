import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createTableMock, type QueryResponse } from '@/__tests__/helpers/queryHarness';
import { createCatequistasTeam, createResponsablesTeam } from './communityTeams';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));

let responses: Record<string, QueryResponse>;
let mock: ReturnType<typeof createTableMock>;
beforeEach(() => {
  responses = { teams: { data: null, error: null } };
  mock = createTableMock(responses); db.from.mockImplementation(mock.from);
});

describe('communityTeams', () => {
  it('crea el equipo de responsables de la comunidad', async () => {
    await createResponsablesTeam({ id: 5, number: '12' });
    expect(mock.calls).toContainEqual({ table: 'teams', method: 'insert', args: [{ name: 'Equipo de Responsables - Comunidad 12', team_type_id: 4, community_id: 5 }] });
  });

  it('numera el siguiente equipo de catequistas', async () => {
    await createCatequistasTeam({ id: 5, number: '12' }, 2);
    expect(mock.calls).toContainEqual({ table: 'teams', method: 'insert', args: [{ name: 'Equipo de Catequistas 3 - Comunidad 12', team_type_id: 3, community_id: 5 }] });
  });

  it('propaga el error de Supabase', async () => {
    responses.teams.error = { message: 'denied' };
    await expect(createResponsablesTeam({ id: 5 })).rejects.toEqual({ message: 'denied' });
    await expect(createCatequistasTeam({ id: 5 }, 0)).rejects.toEqual({ message: 'denied' });
  });
});
