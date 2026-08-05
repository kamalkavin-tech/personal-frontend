'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  KeyRound,
  StickyNote,
  FolderLock,
  Images,
  IdCard,
  CreditCard,
  Braces,
  ShieldQuestion,
  BookHeart,
  MapPin,
  Users,
  DatabaseBackup,
  ShieldCheck,
  Settings,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/passwords', label: 'Passwords', icon: KeyRound },
  { href: '/notes', label: 'Secure Notes', icon: StickyNote },
  { href: '/files', label: 'File Vault', icon: FolderLock },
  { href: '/identities', label: 'Identity Vault', icon: IdCard },
  { href: '/api-keys', label: 'API Keys', icon: Braces },
  { href: '/secrets', label: 'Secret Vault', icon: ShieldQuestion },
  { href: '/journal', label: 'Journal', icon: BookHeart },
  { href: '/addresses', label: 'Addresses', icon: MapPin },
  { href: '/backup', label: 'Backup', icon: DatabaseBackup },
  { href: '/security', label: 'Security Center', icon: ShieldCheck },
  { href: '/trash', label: 'Trash', icon: Trash2 },
];

const BOTTOM = [{ href: '/settings', label: 'Settings', icon: Settings }];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();

  const item = (href: string, label: string, Icon: typeof LayoutDashboard, bottom = false) => {
    const active = pathname.startsWith(href);
    return (
      <Tooltip key={href}>
        <TooltipTrigger asChild>
          <Link
            href={href}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 hover:translate-x-0.5',
              active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              collapsed && 'justify-center px-2 hover:translate-x-0',
              bottom && 'mt-auto',
            )}
          >
            {active && <motion.span layoutId={`nav-${href}`} className="absolute left-0 h-6 w-1 rounded-full bg-primary" />}
            <Icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{label}</span>}
          </Link>
        </TooltipTrigger>
        {collapsed && <TooltipContent side="right">{label}</TooltipContent>}
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <nav className={cn('flex h-full flex-col gap-1 overflow-y-auto p-3 scrollbar-thin', collapsed && 'items-center')}>
        <div className={cn('flex flex-col gap-1', collapsed && 'w-full')}>
          {NAV.map((n) => item(n.href, n.label, n.icon))}
        </div>
        <div className={cn('flex flex-col gap-1 mt-4 border-t pt-3', collapsed && 'w-full')}>
          {BOTTOM.map((n) => item(n.href, n.label, n.icon, true))}
        </div>
      </nav>
    </TooltipProvider>
  );
}
