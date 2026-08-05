'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Activity,
  ArrowRight,
  Database,
  FileText,
  HardDrive,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  StickyNote,
} from 'lucide-react';
import type { VaultType } from '@vaultx/shared';
import { useAuth } from '@/context/auth-context';
import { useStats } from '@/lib/queries';
import { useDecryptedTitles } from '@/hooks/use-decrypted';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/misc';
import { TypeIcon } from '@/components/vault/type-icon';
import { formatBytes, timeAgo } from '@/lib/utils';
import { VAULT_TYPE_META } from '@vaultx/shared';

const QUICK = [
  { label: 'Passwords', href: '/passwords', icon: KeyRound },
  { label: 'Notes', href: '/notes', icon: StickyNote },
  { label: 'Files', href: '/files', icon: FileText },
  { label: 'Backup', href: '/backup', icon: Database },
  { label: 'Security', href: '/security', icon: ShieldCheck },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { dek } = useAuth();
  const { data, isLoading } = useStats();
  const titles = useDecryptedTitles(data?.recentItems ?? [], dek);

  const security = (data?.security as any) ?? {};
  const score = security.score ?? 0;
  const byType = (data?.byType ?? {}) as Record<string, number>;
  const presentTypes = Object.entries(byType).filter(([, count]) => count > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s in your encrypted vault.</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={score >= 80 ? 'success' : score >= 50 ? 'warning' : 'destructive'} className="gap-1">
            <ShieldCheck className="h-3 w-3" /> Security score {score}/100
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex flex-col gap-1 p-5">
                <span className="text-xs font-medium text-muted-foreground">Total items</span>
                <span className="text-3xl font-bold">{data?.totalItems ?? 0}</span>
                <span className="text-xs text-muted-foreground">across all vaults</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1 p-5">
                <span className="text-xs font-medium text-muted-foreground">Files & photos</span>
                <span className="text-3xl font-bold">{data?.filesCount ?? 0}</span>
                <span className="text-xs text-muted-foreground">encrypted in GridFS</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1 p-5">
                <span className="text-xs font-medium text-muted-foreground">Storage used</span>
                <span className="flex items-center gap-2 text-3xl font-bold">
                  <HardDrive className="h-6 w-6 text-muted-foreground" />
                  {formatBytes(data?.storageUsedBytes ?? 0)}
                </span>
                <span className="text-xs text-muted-foreground">encrypted at rest</span>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex flex-col gap-1 p-5">
                <span className="text-xs font-medium text-muted-foreground">Active sessions</span>
                <span className="text-3xl font-bold">{security.activeSessions ?? 0}</span>
                <span className="text-xs text-muted-foreground">
                  {security.twoFactorEnabled ? '2FA enabled' : '2FA not enabled'}
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Recent items</CardTitle>
                  <Link href="/passwords" className="flex items-center gap-1 text-xs text-primary hover:underline">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </CardHeader>
                <CardContent>
                  {data?.recentItems?.length ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(data.recentItems as any[]).map((item) => (
                        <Link key={item._id} href={`/${typeRoute(item.type)}`} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent">
                          <TypeIcon type={item.type as VaultType} size="h-4 w-4" />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{titles[item._id] ?? '…'}</p>
                            <p className="text-xs text-muted-foreground">{timeAgo(item.updatedAt)}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="py-8 text-center text-sm text-muted-foreground">No items yet — create your first one.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Quick access</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                  {QUICK.map((q) => (
                    <Link
                      key={q.href}
                      href={q.href}
                      className="flex items-center gap-2 rounded-lg border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent"
                    >
                      <q.icon className="h-4 w-4 text-primary" />
                      {q.label}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your vaults</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {presentTypes.length === 0 && <p className="text-sm text-muted-foreground">Nothing stored yet.</p>}
                  {presentTypes.map(([type, count]) => (
                    <Link key={type} href={`/${typeRoute(type as VaultType)}`} className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent">
                      <span className="flex items-center gap-2 text-sm font-medium">
                        <TypeIcon type={type as VaultType} size="h-4 w-4" />
                        {VAULT_TYPE_META[type as VaultType]?.label ?? type}
                      </span>
                      <span className="text-sm text-muted-foreground">{count}</span>
                    </Link>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Recent logins</CardTitle>
                  <Link href="/security" className="text-xs text-primary hover:underline">
                    Details
                  </Link>
                </CardHeader>
                <CardContent className="space-y-3">
                  {security.recentLogins?.length ? (
                    (security.recentLogins as any[]).map((event) => (
                      <div key={event._id} className="flex items-start gap-2 text-sm">
                        {event.type === 'failed' ? (
                          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                        ) : event.type === '2fa' ? (
                          <ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        ) : (
                          <Activity className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                        )}
                        <div className="min-w-0">
                          <p className="capitalize text-foreground">{event.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {event.ip ?? 'unknown ip'} · {timeAgo(event.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No login events yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function typeRoute(type: VaultType): string {
  const map: Partial<Record<VaultType, string>> = {
    login: 'passwords',
    password: 'passwords',
    note: 'notes',
    card: 'payments',
    identity: 'identities',
    apiKey: 'api-keys',
    secret: 'secrets',
    journal: 'journal',
    address: 'addresses',
  };
  return map[type] ?? 'passwords';
}
