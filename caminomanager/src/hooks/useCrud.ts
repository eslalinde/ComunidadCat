import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { QueryParams, BaseEntity } from '@/types/database';
import { queryKeys } from '@/lib/queryKeys';
import { friendlyError } from '@/lib/supabaseErrors';
import { toast } from 'sonner';

/** Strip accents from a string (e.g. "Medellín" → "Medellin") */
function stripAccents(term: string): string {
  return term.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/** Map plain chars to their accented Spanish variant */
const ACCENT_OF: Record<string, string> = {
  a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú',
  A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú',
  n: 'ñ', N: 'Ñ',
};

/**
 * Generate accent search variants for a term.
 * Returns the original, the accent-stripped version, and one variant per
 * vowel/ñ position with that character accented.
 * e.g. "Maria" → ["Maria", "Mária", "María", "Mariá"]
 */
function accentVariants(term: string): string[] {
  const stripped = stripAccents(term);
  const variants = new Set<string>();
  variants.add(term);
  variants.add(stripped);

  for (let i = 0; i < stripped.length; i++) {
    const accented = ACCENT_OF[stripped[i]];
    if (accented) {
      variants.add(stripped.slice(0, i) + accented + stripped.slice(i + 1));
    }
  }

  return Array.from(variants);
}

export interface ForeignKeyRelation {
  foreignKey: string;
  tableName: string;
  displayField: string;
  alias?: string;
}

export interface UseCrudOptions<T extends BaseEntity> {
  tableName: string;
  searchFields?: (keyof T)[];
  defaultSort?: { field: keyof T; asc: boolean };
  pageSize?: number;
  foreignKeys?: ForeignKeyRelation[];
}

export interface UseCrudReturn<T extends BaseEntity> {
  data: T[];
  loading: boolean;
  error: string | null;
  count: number;
  page: number;
  totalPages: number;
  search: string;
  sort: { field: keyof T; asc: boolean };
  
  // Actions
  fetchData: (params?: QueryParams) => Promise<void>;
  create: (data: Omit<T, 'id' | 'created_at' | 'updated_at'>) => Promise<T>;
  update: (id: number, data: Partial<T>) => Promise<T>;
  delete: (id: number) => Promise<void>;
  
  // UI state
  setSearch: (search: string) => void;
  setSort: (sort: { field: keyof T; asc: boolean }) => void;
  setPage: (page: number) => void;
  clearError: () => void;
}

interface CrudQueryState<T extends BaseEntity> {
  search: string;
  sort: { field: keyof T; asc: boolean };
  page: number;
  filters: Record<string, any>;
}

interface CrudQueryData<T extends BaseEntity> {
  items: T[];
  count: number;
  page: number;
}

export function useCrud<T extends BaseEntity>({
  tableName,
  searchFields = [],
  defaultSort = { field: 'id' as keyof T, asc: true },
  pageSize = 10,
  foreignKeys = []
}: UseCrudOptions<T>): UseCrudReturn<T> {
  const supabase = useMemo(() => createClient(), []);
  const queryClient = useQueryClient();

  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: keyof T; asc: boolean }>(defaultSort);
  const [filters, setFilters] = useState<Record<string, any>>({});

  const clearError = useCallback(() => setError(null), []);

  const currentParams: CrudQueryState<T> = useMemo(
    () => ({
      search,
      sort,
      page,
      filters,
    }),
    [search, sort, page, filters]
  );

  const queryKey = useMemo(() => queryKeys.crud.list(tableName, pageSize, currentParams), [tableName, pageSize, currentParams]);

  const fetchEntities = useCallback(
    async (params: CrudQueryState<T>): Promise<CrudQueryData<T>> => {
      try {
        // Build select statement with foreign key joins
        let selectFields = '*';
        if (foreignKeys.length > 0) {
          const foreignKeySelects = foreignKeys.map(fk => {
            const alias = fk.alias || fk.tableName;
            return `${alias}:${fk.foreignKey}(${fk.displayField})`;
          });
          selectFields = `*, ${foreignKeySelects.join(', ')}`;
        }

        let query = supabase.from(tableName).select(selectFields, { count: 'exact' });

        // Apply filters
        if (params.filters) {
          Object.entries(params.filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
              query = query.eq(key, value);
            }
          });
        }

        // Apply search (accent-insensitive via per-vowel accent variants)
        const searchTerm = params.search;
        if (searchTerm && searchFields.length > 0) {
          const terms = accentVariants(searchTerm);

          // Separate regular fields from foreign key fields
          const regularFields: string[] = [];
          const foreignKeySearches: { foreignKey: string; displayField: string; tableName: string }[] = [];

          searchFields.forEach(field => {
            const fieldStr = String(field);
            const foreignKeyConfig = foreignKeys.find(fk => fk.alias === fieldStr);

            if (foreignKeyConfig) {
              foreignKeySearches.push({
                foreignKey: foreignKeyConfig.foreignKey,
                displayField: foreignKeyConfig.displayField,
                tableName: foreignKeyConfig.tableName,
              });
            } else {
              regularFields.push(fieldStr);
            }
          });

          // Handle foreign key searches by querying related tables first
          if (foreignKeySearches.length > 0) {
            try {
              // Search in related tables to get matching IDs
              const foreignKeyIds = new Set<number>();

              for (const fkSearch of foreignKeySearches) {
                for (const term of terms) {
                  const { data: relatedData } = await supabase
                    .from(fkSearch.tableName)
                    .select('id')
                    .ilike(fkSearch.displayField, `%${term}%`);

                  if (relatedData) {
                    relatedData.forEach(item => foreignKeyIds.add(item.id));
                  }
                }
              }

              // If we found matching foreign key IDs, add them to the query
              if (foreignKeyIds.size > 0) {
                const ids = Array.from(foreignKeyIds);
                const foreignKeyConditions: string[] = [];
                foreignKeySearches.forEach(fkSearch => {
                  foreignKeyConditions.push(`${fkSearch.foreignKey}.in.(${ids.join(',')})`);
                });

                const allConditions: string[] = [];

                if (regularFields.length > 0) {
                  terms.forEach(term => {
                    regularFields.forEach(field => {
                      allConditions.push(`${field}.ilike.%${term}%`);
                    });
                  });
                }

                allConditions.push(...foreignKeyConditions);

                if (allConditions.length > 0) {
                  query = query.or(allConditions.join(','));
                }
              } else if (regularFields.length > 0) {
                const conditions = terms.flatMap(term =>
                  regularFields.map(field => `${field}.ilike.%${term}%`)
                );
                query = query.or(conditions.join(','));
              }
            } catch (err) {
              console.error('Error searching foreign key fields:', err);
              if (regularFields.length > 0) {
                const conditions = terms.flatMap(term =>
                  regularFields.map(field => `${field}.ilike.%${term}%`)
                );
                query = query.or(conditions.join(','));
              }
            }
          } else if (regularFields.length > 0) {
            const conditions = terms.flatMap(term =>
              regularFields.map(field => `${field}.ilike.%${term}%`)
            );
            query = query.or(conditions.join(','));
          }
        }

        // Apply sorting
        const sortConfig = params.sort;
        query = query.order(sortConfig.field as string, { ascending: sortConfig.asc });

        // Apply pagination
        const currentPage = params.page || 1;
        const from = (currentPage - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data: result, error: queryError, count: totalCount } = await query;

        if (queryError) throw queryError;

        return {
          items: (result as unknown as T[]) || [],
          count: totalCount || 0,
          page: currentPage,
        };
      } catch (err: any) {
        const message = err?.message || 'Error al cargar los datos';
        setError(message);
        throw new Error(message);
      }
  },
    [foreignKeys, supabase, tableName, searchFields, pageSize]
  );

  const query = useQuery<CrudQueryData<T>>({
    queryKey,
    queryFn: () => fetchEntities(currentParams),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });

  const invalidateTableQueries = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.crud.table(tableName) }),
    [queryClient, tableName]
  );

  const createMutation = useMutation<T, Error, Omit<T, 'id' | 'created_at' | 'updated_at'>, { previousData?: CrudQueryData<T> }>({
    mutationFn: async (newData) => {
      const { data: result, error } = await supabase
        .from(tableName)
        .insert<Omit<T, 'id' | 'created_at' | 'updated_at'>>([newData])
        .select()
        .single();

      if (error) throw error;
      return result as unknown as T;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.crud.table(tableName) });
      const previousData = queryClient.getQueryData<CrudQueryData<T>>(queryKey);
      const tempId = Date.now() * -1;

      queryClient.setQueryData<CrudQueryData<T>>(queryKey, (current) => {
        if (!current) return current;
        const optimisticItem = { ...(newData as any), id: tempId } as T;
        return {
          ...current,
          items: [optimisticItem, ...current.items].slice(0, pageSize),
          count: current.count + 1,
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Registro creado correctamente');
    },
    onError: (err: any, _variables, context) => {
      const message = friendlyError(err);
      setError(message);
      toast.error(message);
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => invalidateTableQueries(),
  });

  const updateMutation = useMutation<T, Error, { id: number; data: Partial<T> }, { previousData?: CrudQueryData<T> }>({
    mutationFn: async ({ id, data }) => {
      const { data: result, error } = await supabase
        .from(tableName)
        .update<Record<string, unknown>>({ ...data })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as unknown as T;
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.crud.table(tableName) });
      const previousData = queryClient.getQueryData<CrudQueryData<T>>(queryKey);

      queryClient.setQueryData<CrudQueryData<T>>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.map(item => (item.id === id ? { ...item, ...data } : item)),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Registro actualizado correctamente');
    },
    onError: (err: any, _variables, context) => {
      const message = friendlyError(err);
      setError(message);
      toast.error(message);
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => invalidateTableQueries(),
  });

  const deleteMutation = useMutation<void, Error, number, { previousData?: CrudQueryData<T> }>({
    mutationFn: async (id) => {
      const { error, count } = await supabase.from(tableName).delete({ count: 'exact' }).eq('id', id);
      if (error) throw error;
      if (count === 0) {
        throw new Error('No se pudo eliminar el registro. Es posible que no tengas permisos o que el registro ya haya sido eliminado.');
      }
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.crud.table(tableName) });
      const previousData = queryClient.getQueryData<CrudQueryData<T>>(queryKey);

      queryClient.setQueryData<CrudQueryData<T>>(queryKey, (current) => {
        if (!current) return current;
        return {
          ...current,
          items: current.items.filter(item => item.id !== id),
          count: Math.max(0, current.count - 1),
        };
      });

      return { previousData };
    },
    onSuccess: () => {
      toast.success('Registro eliminado correctamente');
    },
    onError: (err: any, _variables, context) => {
      const message = friendlyError(err);
      setError(message);
      toast.error(message);
      if (context?.previousData) {
        queryClient.setQueryData(queryKey, context.previousData);
      }
    },
    onSettled: () => invalidateTableQueries(),
  });

  const fetchData = useCallback(
    async (params?: QueryParams) => {
      const nextSearch = params?.search ?? search;
      const nextSort = (params?.sort as { field: keyof T; asc: boolean } | undefined) ?? sort;
      const nextPage = params?.page ?? page;
      const nextFilters = params?.filters ?? filters;

      setSearch(nextSearch);
      setSort(nextSort);
      setPage(nextPage);
      setFilters(nextFilters);
      setError(null);

      await queryClient.invalidateQueries({ queryKey: queryKeys.crud.table(tableName) });
    },
    [filters, page, queryClient, search, sort, tableName]
  );

  const loading =
    query.isFetching ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  const data = query.data?.items || [];
  const count = query.data?.count || 0;

  return {
    data,
    loading,
    error,
    count,
    page,
    totalPages: Math.max(1, Math.ceil(count / pageSize)),
    search,
    sort,
    fetchData,
    create: createMutation.mutateAsync,
    update: (id: number, data: Partial<T>) => updateMutation.mutateAsync({ id, data }),
    delete: (id: number) => deleteMutation.mutateAsync(id),
    setSearch,
    setSort,
    setPage,
    clearError
  };
}

