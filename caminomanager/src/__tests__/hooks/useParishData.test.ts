import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useParishData } from '@/hooks/useParishData';
import { queryKeys } from '@/lib/queryKeys';
import { createQueryHarness, createTableMock, type QueryResponse } from '../helpers/queryHarness';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));
let harness: ReturnType<typeof createQueryHarness>;
let responses: Record<string, QueryResponse>;
beforeEach(() => {
  harness = createQueryHarness();
  responses = {
    parishes: { data: { id: 10, name: 'Parroquia' }, error: null },
    priests: { data: [{ id: 1, parish_id: 10 }], error: null },
    communities: { data: [{ id: 2, number: '1', parish_id: 10 }], error: null },
  };
  db.from.mockReset().mockImplementation(createTableMock(responses).from);
});
afterEach(() => { cleanup(); harness.client.clear(); vi.restoreAllMocks(); });

it('carga el detalle y las relaciones y permite invalidarlas independientemente', async () => {
  const invalidate = vi.spyOn(harness.client, 'invalidateQueries');
  const { result } = renderHook(() => useParishData(10), { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current).toMatchObject({ parish: responses.parishes.data, priests: responses.priests.data, communities: responses.communities.data, error: null });
  for (const [operation, queryKey] of [
    [result.current.invalidateDetail, queryKeys.parish.detail(10)],
    [result.current.invalidatePriests, queryKeys.parish.priests(10)],
    [result.current.invalidateCommunities, queryKeys.parish.communities(10)],
    [result.current.refreshParish, queryKeys.parish.all],
  ] as const) {
    await act(async () => { await operation(); });
    expect(invalidate).toHaveBeenLastCalledWith({ queryKey });
  }
});

it('no consulta sin id y normaliza respuestas nulas', async () => {
  const { result, rerender } = renderHook(({ id }) => useParishData(id), { wrapper: harness.wrapper, initialProps: { id: 0 } });
  expect(db.from).not.toHaveBeenCalled();
  for (const table of Object.keys(responses)) responses[table].data = null;
  rerender({ id: 10 });
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(result.current).toMatchObject({ parish: null, priests: [], communities: [], error: null });
});

it.each(['parishes', 'priests', 'communities'])('propaga el error de %s', async (table) => {
  responses[table] = { data: null, error: { message: `Error ${table}` } };
  const { result } = renderHook(() => useParishData(10), { wrapper: harness.wrapper });
  await waitFor(() => expect(result.current.error).toBe(`Error ${table}`));
});
