'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/context/auth-context';

const SearchContext = createContext<{ query: string; setQuery: (q: string) => void }>({ query: '', setQuery: () => {} });

export function useSearch() {
  return useContext(SearchContext);
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }));
  const [query, setQuery] = useState('');

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <SearchContext.Provider value={{ query, setQuery }}>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
            <Toaster position="top-right" richColors theme={typeof window !== 'undefined' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : 'light'} />
          </SearchContext.Provider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
