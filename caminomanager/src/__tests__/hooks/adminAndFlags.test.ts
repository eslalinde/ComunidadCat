import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useFeatureFlags, useFeatureFlag } from '@/hooks/useFeatureFlags';
import { createQueryHarness, createTableMock, type QueryResponse } from '../helpers/queryHarness';
import type { AppRole } from '@/lib/permissions';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), signUp: vi.fn(), temporary: vi.fn(), setFlags: vi.fn(), auth: { user: { id: 'admin-id' } as { id: string } | null, userScope: { role: 'admin' as AppRole, person_id: null as number | null }, featureFlags: {} as Record<string, boolean> } }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => mocks }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.temporary }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ ...mocks.auth, setFeatureFlags: mocks.setFlags }) }));
let harness: ReturnType<typeof createQueryHarness>;
let responses: Record<string, QueryResponse>;
beforeEach(() => {
  vi.clearAllMocks(); harness = createQueryHarness();
  mocks.rpc.mockResolvedValue({ data: [], error: null });
  mocks.signUp.mockResolvedValue({ data: { user: { id: 'new-id' } }, error: null });
  mocks.temporary.mockReturnValue({ auth: { signUp: mocks.signUp } });
  mocks.auth = { user: { id: 'admin-id' }, userScope: { role: 'admin', person_id: null }, featureFlags: {} };
  responses = { belongs: { data: null, count: 0, error: null }, profiles: { data: null, error: null } };
  mocks.from.mockImplementation(createTableMock(responses).from);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});
afterEach(() => { cleanup(); harness.client.clear(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });

it('administración consulta solo cuando está habilitada y expone errores', async () => {
  const { result, rerender } = renderHook(({ enabled }) => useAdminUsers(enabled), { wrapper: harness.wrapper, initialProps: { enabled: false } });
  expect(mocks.rpc).not.toHaveBeenCalled();
  mocks.rpc.mockResolvedValueOnce({ data: [{ id: 'u', email: 'ana@test.local' }], error: null });
  rerender({ enabled: true });
  await waitFor(() => expect(result.current.users).toHaveLength(1));
  mocks.rpc.mockResolvedValue({ data: null, error: { message: 'Sin permiso' } });
  await act(async () => { await harness.client.invalidateQueries(); });
  await waitFor(() => expect(result.current.error?.message).toBe('Sin permiso'));
});
it.each([false, true])('asigna rol y alcance, fallo=%s', async (fails) => {
  const invalidate = vi.spyOn(harness.client, 'invalidateQueries');
  const { result } = renderHook(() => useAdminUsers(), { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  mocks.rpc.mockResolvedValueOnce({ error: fails ? { message: 'No autorizado' } : null });
  act(() => result.current.updateRole({ targetUserId: 'u', newRole: 'zone_leader', zoneId: 3, personId: 4 }));
  await waitFor(() => expect(harness.client.getMutationCache().getAll()[0]?.state.status).toBe(fails ? 'error' : 'success'));
  expect(mocks.rpc).toHaveBeenCalledWith('set_user_role', { target_user_id: 'u', new_role: 'zone_leader', new_person_id: 4, new_zone_id: 3, new_community_id: null });
  expect(invalidate).toHaveBeenCalledTimes(fails ? 0 : 1);
});
it.each(['success', 'signup-error', 'no-user', 'role-error'])('creación de usuario: %s', async (scenario) => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54321'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', 'test');
  const { result } = renderHook(() => useAdminUsers(false), { wrapper: harness.wrapper });
  if (scenario === 'signup-error') mocks.signUp.mockResolvedValue({ data: {}, error: { message: 'Duplicado' } });
  if (scenario === 'no-user') mocks.signUp.mockResolvedValue({ data: { user: null }, error: null });
  if (scenario === 'role-error') mocks.rpc.mockResolvedValue({ error: { message: 'Sin permiso' } });
  act(() => result.current.createUser({ email: 'ana@test.local', password: 'Test123!', fullName: 'Ana', role: 'community_responsible', communityId: 10 }));
  await waitFor(() => expect(harness.client.getMutationCache().getAll()[0]?.state.status).toBe(scenario === 'success' ? 'success' : 'error'));
  expect(mocks.temporary).toHaveBeenCalledWith('http://127.0.0.1:54321', 'test', { auth: { persistSession: false } });
  expect(mocks.signUp).toHaveBeenCalledWith({ email: 'ana@test.local', password: 'Test123!', options: { data: { full_name: 'Ana' } } });
  if (scenario === 'success' || scenario === 'role-error') expect(mocks.rpc).toHaveBeenCalledWith('set_user_role', { target_user_id: 'new-id', new_role: 'community_responsible', new_person_id: null, new_zone_id: null, new_community_id: 10 });
  else expect(mocks.rpc).not.toHaveBeenCalled();
});

it.each([
  ['admin', null, 0, ['community_visits', 'community_inventory']],
  ['contributor', null, 0, ['community_visits', 'community_inventory']],
  ['community_responsible', null, 0, ['community_inventory']],
  ['viewer', null, 0, []], ['viewer', 1, 1, ['community_visits', 'community_inventory']],
] as const)('eligibilidad de flags: %s persona=%s', async (role, personId, count, keys) => {
  mocks.auth.userScope = { role, person_id: personId }; responses.belongs.count = count;
  const { result } = renderHook(useFeatureFlags, { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.availableFlags.map((f) => f.key)).toEqual(keys));
  expect(result.current.isEnabled('community_visits')).toBe(false);
  expect(result.current.isEnabled('desconocida')).toBe(false);
});
it('override de flags no concede elegibilidad y error de consulta falla cerrado', async () => {
  mocks.auth.userScope = { role: 'viewer', person_id: 1 }; mocks.auth.featureFlags = { community_visits: true };
  responses.belongs.error = { message: 'Sin permiso' };
  const { result } = renderHook(() => useFeatureFlag('community_visits'), { wrapper: harness.wrapper });
  await waitFor(() => expect(console.error).toHaveBeenCalled());
  expect(result.current).toBe(false);
});
it.each(['success', 'error', 'rejection', 'anonymous'])('toggle optimista: %s', async (scenario) => {
  mocks.auth.featureFlags = { community_visits: true };
  if (scenario === 'anonymous') mocks.auth.user = null;
  if (scenario === 'error') responses.profiles.error = { message: 'Sin permiso' };
  if (scenario === 'rejection') mocks.from.mockImplementation(() => { throw new Error('Offline'); });
  const { result } = renderHook(useFeatureFlags, { wrapper: harness.wrapper });
  expect(result.current.isEnabled('community_visits')).toBe(true);
  await act(async () => result.current.toggleFlag('community_visits'));
  if (scenario === 'anonymous') expect(mocks.setFlags).not.toHaveBeenCalled();
  else {
    expect(mocks.setFlags).toHaveBeenNthCalledWith(1, { community_visits: false });
    if (scenario !== 'success') expect(mocks.setFlags).toHaveBeenLastCalledWith({ community_visits: true });
  }
});
