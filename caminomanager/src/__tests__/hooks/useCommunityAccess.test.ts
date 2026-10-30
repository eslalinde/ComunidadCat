import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCommunityAccessUsers, useMyCommunitiesAccess } from '@/hooks/useCommunityAccess';
import { queryKeys } from '@/lib/queryKeys';

const db = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
let client: QueryClient;
function wrapper({ children }: PropsWithChildren) {
  return createElement(QueryClientProvider, { client }, children);
}
beforeEach(() => {
  db.rpc.mockReset().mockResolvedValue({ data: [], error: null });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
});
afterEach(() => { cleanup(); client.clear(); vi.restoreAllMocks(); });

describe('accesos de comunidad con React Query real', () => {
  it('no consulta hasta habilitarse y separa la caché por comunidad', async () => {
    const { result, rerender } = renderHook(({ id, enabled }) => useCommunityAccessUsers(id, enabled), { wrapper, initialProps: { id: 10, enabled: false } });
    expect(db.rpc).not.toHaveBeenCalled();
    const user = { user_id: 'viewer-id', email: 'viewer@test.local', role: 'viewer', source: 'grant' };
    db.rpc.mockResolvedValueOnce({ data: [user], error: null });
    rerender({ id: 10, enabled: true });
    await waitFor(() => expect(result.current.accessUsers).toEqual([user]));
    expect(db.rpc).toHaveBeenCalledWith('get_community_access_users', { p_community_id: 10 });
    rerender({ id: 20, enabled: true });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.accessUsers).toEqual([]);
    expect(client.getQueryData(queryKeys.communityAccess.community(10))).toEqual([user]);
  });

  it.each(['grant', 'revoke'] as const)('%s invalida y recarga los accesos de la comunidad', async (operation) => {
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCommunityAccessUsers(10), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => { if (operation === 'grant') result.current.grantAccess('user-id'); else result.current.revokeAccess('user-id'); });
    await waitFor(() => expect(db.rpc).toHaveBeenCalledWith(`${operation}_community_access`, { p_user_id: 'user-id', p_community_id: 10 }));
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.communityAccess.community(10) }));
    expect(db.rpc.mock.calls.filter(([name]) => name === 'get_community_access_users')).toHaveLength(2);
  });

  it.each(['grant', 'revoke'] as const)('no anuncia cambios en caché si falla %s', async (operation) => {
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useCommunityAccessUsers(10), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    db.rpc.mockResolvedValueOnce({ data: null, error: { message: 'Sin permiso' } });
    act(() => { if (operation === 'grant') result.current.grantAccess('user-id'); else result.current.revokeAccess('user-id'); });
    await waitFor(() => expect(client.getMutationCache().getAll()[0]?.state.status).toBe('error'));
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('propaga errores de lectura sin inventar accesos', async () => {
    const error = { message: 'No autorizado' };
    db.rpc.mockResolvedValue({ data: null, error });
    const { result } = renderHook(() => useCommunityAccessUsers(10), { wrapper });
    await waitFor(() => expect(result.current.error).toEqual(error));
    expect(result.current.accessUsers).toEqual([]);
  });

  it('consulta los accesos propios, normaliza null y propaga errores', async () => {
    db.rpc.mockResolvedValueOnce({ data: null, error: null });
    const { result } = renderHook(useMyCommunitiesAccess, { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.communities).toEqual([]);
    expect(db.rpc).toHaveBeenCalledWith('get_my_community_access');
    const community = { community_id: 10, community_number: '1', parish_name: 'Parroquia', granted_at: '2026-10-30' };
    db.rpc.mockResolvedValueOnce({ data: [community], error: null });
    await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.communityAccess.mine() }); });
    await waitFor(() => expect(result.current.communities).toEqual([community]));
    db.rpc.mockResolvedValue({ data: null, error: { message: 'Sesión vencida' } });
    await act(async () => { await client.invalidateQueries({ queryKey: queryKeys.communityAccess.mine() }); });
    await waitFor(() => expect(result.current.error).toEqual({ message: 'Sesión vencida' }));
  });
});
