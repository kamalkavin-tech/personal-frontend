'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Bell, LogOut, Moon, PanelLeftClose, PanelLeftOpen, Search, ShieldCheck, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter as useNav } from 'next/navigation';
import { initials } from '@/lib/utils';

export function Topbar({ collapsed, onToggle, onSearch }: { collapsed: boolean; onToggle: () => void; onSearch: (q: string) => void }) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useNav();
  const [query, setQuery] = useState('');

  const { data } = useQuery({
    queryKey: ['notifications-badge'],
    queryFn: () => api.get<{ unread: number }>('/notifications').then((d) => ({ unread: (d as { unread?: number }).unread ?? 0 })),
    refetchInterval: 60_000,
  });

  const unread = data?.unread ?? 0;

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <Button variant="ghost" size="icon" onClick={onToggle} className="shrink-0">
        {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      </Button>

      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your vault… (encrypted & decrypted locally)"
          className="pl-9"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onSearch(e.target.value);
          }}
        />
      </div>

      <div className="ml-auto flex items-center gap-1">
        <Button variant="ghost" size="icon" onClick={() => router.push('/security')} className="relative">
          <ShieldCheck className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => router.push('/backup')}>
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 rounded-full outline-none ring-ring focus-visible:ring-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(user?.name, user?.email)}</AvatarFallback>
              </Avatar>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="text-sm font-medium">{user?.name ?? 'VaultX user'}</div>
              <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push('/profile')}>Profile</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/settings')}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                await logout();
                toast.success('Signed out');
                router.push('/');
              }}
            >
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
