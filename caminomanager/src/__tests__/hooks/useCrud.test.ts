import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCrud } from '@/hooks/useCrud';
import { queryKeys } from '@/lib/queryKeys';
import type { Country } from '@/types/database';
import { toast } from 'sonner';

const db = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/utils/supabase/client', () => ({ createClient: () => db }));

interface DbResponse {
  data: unknown;
  error: { code: string; message: string } | null;
  count: number | null;
}

const countries: Country[] = [{ id: 1, name: 'Colombia', code: 'CO' }];
let listResponse: DbResponse;
let mutationResponse: Promise<DbResponse>;
let client: QueryClient;
const calls = {
  select: vi.fn(), order: vi.fn(), range: vi.fn(), or: vi.fn(),
  eq: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
};

function makeQuery() {
  let mutation = false;
  const query = {
    select: (...args: unknown[]) => { calls.select(...args); return query; },
    order: (...args: unknown[]) => { calls.order(...args); return query; },
    range: (...args: unknown[]) => { calls.range(...args); return query; },
    or: (...args: unknown[]) => { calls.or(...args); return query; },
    eq: (...args: unknown[]) => { calls.eq(...args); return query; },
    insert: (...args: unknown[]) => { mutation = true; calls.insert(...args); return query; },
    update: (...args: unknown[]) => { mutation = true; calls.update(...args); return query; },
    delete: (...args: unknown[]) => { mutation = true; calls.delete(...args); return query; },
    single: () => query,
    then: (...args: Parameters<Promise<DbResponse>['then']>) =>
      (mutation ? mutationResponse : Promise.resolve(listResponse)).then(...args),
  };
  return query;
}

function setup() {
  const wrapper = ({ children }: PropsWithChildren) =>
    createElement(QueryClientProvider, { client }, children);
  return renderHook(() => useCrud<Country>({
    tableName: 'countries', searchFields: ['name'], pageSize: 10,
    defaultSort: { field: 'name', asc: true },
  }), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  listResponse = { data: countries, error: null, count: 21 };
  mutationResponse = Promise.resolve({ data: countries[0], error: null, count: 1 });
  db.from.mockImplementation(makeQuery);
  client = new QueryClient({ defaultOptions: {
    queries: { retry: false, gcTime: Infinity }, mutations: { retry: false },
  } });
});

afterEach(() => { cleanup(); client.clear(); });

describe('useCrud con React Query real', () => {
  it('carga datos, ordena y cambia el rango al paginar', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual(countries);
    expect(result.current.totalPages).toBe(3);
    expect(calls.select).toHaveBeenCalledWith('*', { count: 'exact' });
    expect(calls.order).toHaveBeenCalledWith('name', { ascending: true });
    expect(calls.range).toHaveBeenCalledWith(0, 9);
    act(() => result.current.setPage(2));
    await waitFor(() => expect(calls.range).toHaveBeenCalledWith(10, 19));
  });

  it('busca con variantes de acento usando el hook de producción', async () => {
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setSearch('Medellín'));
    await waitFor(() => expect(calls.or).toHaveBeenCalled());
    const filter = calls.or.mock.lastCall?.[0] as string;
    expect(filter).toContain('name.ilike.%Medellín%');
    expect(filter).toContain('name.ilike.%Medellin%');
  });

  it('expone los errores de lectura y permite limpiar el mensaje', async () => {
    listResponse = { data: null, error: { code: 'XX000', message: 'Error de lectura' }, count: null };
    const { result } = setup();
    await waitFor(() => expect(result.current.error).toBe('Error de lectura'));
    expect(result.current.data).toEqual([]);
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it('crea un registro e invalida las consultas de la tabla', async () => {
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await expect(result.current.create({ name: 'Colombia', code: 'CO' })).resolves.toEqual(countries[0]);
    });
    expect(calls.insert).toHaveBeenCalledWith([{ name: 'Colombia', code: 'CO' }]);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.crud.table('countries') });
    expect(toast.success).toHaveBeenCalledWith('Registro creado correctamente');
  });

  it('revierte una actualización optimista fallida antes de recargar los datos', async () => {
    let resolveMutation!: (response: DbResponse) => void;
    mutationResponse = new Promise((resolve) => { resolveMutation = resolve; });
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    // Hold the refetch so it cannot hide a missing rollback.
    const invalidate = vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
    let pending!: Promise<Country>;
    act(() => { pending = result.current.update(1, { name: 'Cambio' }); });
    await waitFor(() => expect(result.current.data[0].name).toBe('Cambio'));
    await act(async () => {
      resolveMutation({ data: null, error: { code: '23505', message: 'duplicate' }, count: null });
      await expect(pending).rejects.toMatchObject({ code: '23505' });
    });
    await waitFor(() => expect(result.current.data).toEqual(countries));
    expect(result.current.error).toBeTruthy();
    expect(toast.error).toHaveBeenCalled();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.crud.table('countries') });
    expect(calls.update).toHaveBeenCalledWith({ name: 'Cambio' });
    expect(calls.eq).toHaveBeenCalledWith('id', 1);
  });

  it('rechaza un borrado sin filas afectadas y recupera la lista', async () => {
    mutationResponse = Promise.resolve({ data: null, error: null, count: 0 });
    const { result } = setup();
    await waitFor(() => expect(result.current.loading).toBe(false));
    vi.spyOn(client, 'invalidateQueries').mockResolvedValue(undefined);
    await act(async () => {
      await expect(result.current.delete(1)).rejects.toThrow('No se pudo eliminar el registro');
    });
    await waitFor(() => expect(result.current.data).toEqual(countries));
    expect(calls.delete).toHaveBeenCalledWith({ count: 'exact' });
    expect(toast.success).not.toHaveBeenCalled();
  });
});
