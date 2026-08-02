'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { UnlockScreen } from '@/components/unlock-screen';
import { Sidebar } from '@/components/sidebar';
import { Topbar } from '@/components/topbar';
import { useSearch } from '@/components/providers';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const { setQuery } = useSearch();

  useEffect(() => {
    if (status === 'anonymous') router.replace('/login');
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (status === 'anonymous') return null;

  if (status === 'locked') return <UnlockScreen />;

  return (
    <div className="flex h-screen overflow-hidden">
      <aside
        className={cn(
          'hidden md:flex h-full shrink-0 border-r bg-background transition-all duration-200',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className="flex h-full w-full flex-col">
          <div className={cn('flex h-14 items-center gap-2 border-b px-4', collapsed && 'justify-center px-2')}>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">V</div>
            {!collapsed && <span className="text-sm font-semibold tracking-tight">VaultX</span>}
          </div>
          <Sidebar collapsed={collapsed} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} onSearch={(q) => setQuery(q)} />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-6xl p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
