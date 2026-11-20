import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createClient } from '@/utils/supabase/client';
import { queryKeys } from '@/lib/queryKeys';
import {
  groupCommunitiesByParish,
  type SwitcherParish,
  type SwitcherRow,
} from '@/lib/communitySwitcher';

// Matches the PostgREST max_rows setting, so we page until a short batch.
const PAGE_SIZE = 1000;

export async function fetchSwitcherRows(): Promise<SwitcherRow[]> {
  const supabase = createClient();
  const rows: SwitcherRow[] = [];

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('communities')
      .select('id, number, parish_id, parish:parishes(id, name)')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const batch = (data ?? []) as unknown as SwitcherRow[];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
  }

  return rows;
}

export interface CommunitySwitcherData {
  parishes: SwitcherParish[];
  loading: boolean;
  error: boolean;
}

/**
 * Parishes and communities the current user can see (RLS-filtered), grouped
 * for the in-page switcher on the community detail view.
 */
export function useCommunitySwitcher(): CommunitySwitcherData {
  const query = useQuery({
    queryKey: queryKeys.options.communitySwitcher(),
    queryFn: fetchSwitcherRows,
    staleTime: 60_000,
    gcTime: 300_000,
  });

  const parishes = useMemo(() => groupCommunitiesByParish(query.data ?? []), [query.data]);

  return { parishes, loading: query.isLoading, error: query.isError };
}
