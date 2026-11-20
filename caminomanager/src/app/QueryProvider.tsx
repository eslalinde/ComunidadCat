'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface QueryProviderProps {
  children: React.ReactNode;
}

export function QueryProvider({ children }: QueryProviderProps) {
  const { user } = useAuth();
  return <SessionQueries key={user?.id ?? 'anonymous'}>{children}</SessionQueries>;
}

function SessionQueries({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000, // 1 min datos frescos
            gcTime: 5 * 60_000, // 5 min en cache
            refetchOnWindowFocus: false,
            retry: 1,
            placeholderData: (previousData: unknown) => previousData,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  useEffect(() => () => queryClient.clear(), [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' ? (
        <ReactQueryDevtools initialIsOpen={false} />
      ) : null}
    </QueryClientProvider>
  );
}

