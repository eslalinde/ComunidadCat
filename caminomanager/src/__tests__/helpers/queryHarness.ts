import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement, type PropsWithChildren } from 'react';
import { vi } from 'vitest';

export function createQueryHarness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } } });
  const wrapper = ({ children }: PropsWithChildren) => createElement(QueryClientProvider, { client }, children);
  return { client, wrapper };
}

export interface QueryResponse { data: unknown; error: { message: string; code?: string } | null; count?: number | null }

// Only the transport boundary is simulated. Hooks, transforms and QueryClient stay real.
export function createTableMock(responses: Record<string, QueryResponse>) {
  const calls: { table: string; method: string; args: unknown[] }[] = [];
  const from = vi.fn((table: string) => {
    const record = (method: string, args: unknown[]) => { calls.push({ table, method, args }); return query; };
    const query = {
      select: (...args: unknown[]) => record('select', args),
      eq: (...args: unknown[]) => record('eq', args),
      neq: (...args: unknown[]) => record('neq', args),
      is: (...args: unknown[]) => record('is', args),
      ilike: (...args: unknown[]) => record('ilike', args),
      or: (...args: unknown[]) => record('or', args),
      range: (...args: unknown[]) => record('range', args),
      insert: (...args: unknown[]) => record('insert', args),
      update: (...args: unknown[]) => record('update', args),
      delete: (...args: unknown[]) => record('delete', args),
      upsert: (...args: unknown[]) => record('upsert', args),
      in: (...args: unknown[]) => record('in', args),
      not: (...args: unknown[]) => record('not', args),
      gte: (...args: unknown[]) => record('gte', args),
      lte: (...args: unknown[]) => record('lte', args),
      order: (...args: unknown[]) => record('order', args),
      limit: (...args: unknown[]) => record('limit', args),
      single: () => query,
      maybeSingle: () => query,
      then: (...args: Parameters<Promise<QueryResponse>['then']>) => {
        if (!(table in responses)) throw new Error(`Tabla no preparada: ${table}`);
        return Promise.resolve(responses[table]).then(...args);
      },
    };
    return query;
  });
  return { from, calls };
}
