'use client';

import Link from 'next/link';
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
import { Skeleton } from '@/components/ui/misc';
import { TiltCard } from '@/components/ui/tilt-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { ScoreRing } from '@/components/ui/score-ring';
import { Reveal } from '@/components/ui/reveal';
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

  const stats = [
    {
      label: 'Total items',
      value: data?.totalItems ?? 0,
      suffix: 'across all vaults',
      icon: <ShieldCheck className="h-5 w-5 text-emerald-500" />,
      tint: 'from-emerald-500/15 to-transparent',
    },
    {
      label: 'Files & photos',
      value: data?.filesCount ?? 0,
      suffix: 'encrypted in GridFS',
      icon: <FileText className="h-5 w-5 text-sky-500" />,
      tint: 'from-sky-500/15 to-transparent',
    },
    {
      label: 'Storage used',
      value: data?.storageUsedBytes ?? 0,
      suffix: 'encrypted at rest',
      icon: <HardDrive className="h-5 w-5 text-violet-500" />,
      tint: 'from-violet-500/15 to-transparent',
      bytes: true,
    },
    {
      label: 'Active sessions',
      value: security.activeSessions ?? 0,
      suffix: security.twoFactorEnabled ? '2FA enabled' : '2FA not enabled',
      icon: <Activity className="h-5 w-5 text-amber-500" />,
      tint: 'from-amber-500/15 to-transparent',
    },
  ];

  return (
    <div className="space-y-6">
      <Reveal>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-gradient text-2xl font-bold tracking-tight">
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h1>
            <p className="text-sm text-muted-foreground">Here&apos;s what&apos;s in your encrypted vault.</p>
          </div>
        </div>
      </Reveal>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 0.06}>
                <TiltCard className="group h-full">
                  <Card className="relative h-full overflow-hidden">
                    <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${s.tint}`} />
                    <CardContent className="relative flex h-full flex-col gap-1 p-5">
                      <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                        {s.icon}
                        {s.label}
                      </span>
                      {s.bytes ? (
                        <span className="text-3xl font-bold">{formatBytes(s.value)}</span>
                      ) : (
                        <AnimatedNumber value={s.value} className="text-3xl font-bold" />
                      )}
                      <span className="text-xs text-muted-foreground">{s.suffix}</span>                    </CardContent>
                  </Card>
                </TiltCard>
              </Reveal>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <Reveal delay={0.05}>
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
                          <Link key={item._id} href={`/${typeRoute(item.type)}`} className="group flex items-center gap-3 rounded-lg border bg-background/60 p-3 transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.4)]">
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
              </Reveal>

              <Reveal delay={0.1}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Quick access</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {QUICK.map((q) => (
                      <TiltCard key={q.href} className="group" intensity={5}>
                        <Link
                          href={q.href}
                          className="flex items-center gap-2 rounded-lg border bg-background/60 px-4 py-2.5 text-sm font-medium backdrop-blur transition-colors hover:bg-accent"
                        >
                          <q.icon className="h-4 w-4 text-primary" />
                          {q.label}
                        </Link>
                      </TiltCard>
                    ))}
                  </CardContent>
                </Card>
              </Reveal>
            </div>

            <div className="space-y-6">
              <Reveal delay={0.08}>
                <Card className="overflow-hidden">
                  <CardHeader>
                    <CardTitle className="text-base">Security health</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center gap-4">
                    <ScoreRing value={score} />
                    <p className="text-center text-sm text-muted-foreground">
                      {score >= 80
                        ? 'Your vault is in great shape.'
                        : score >= 50
                          ? 'A few things worth improving.'
                          : 'Review your security settings soon.'}
                    </p>
                    <Link href="/security" className="flex items-center gap-1 text-xs text-primary hover:underline">
                      Open Security Center <ArrowRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              </Reveal>

              <Reveal delay={0.12}>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Your vaults</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {presentTypes.length === 0 && <p className="text-sm text-muted-foreground">Nothing stored yet.</p>}
                    {presentTypes.map(([type, count]) => (
                      <Link key={type} href={`/${typeRoute(type as VaultType)}`} className="flex items-center justify-between rounded-lg border bg-background/60 p-3 transition-all hover:-translate-y-0.5 hover:bg-accent hover:shadow-[0_6px_20px_-8px_hsl(var(--primary)/0.35)]">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          <TypeIcon type={type as VaultType} size="h-4 w-4" />
                          {VAULT_TYPE_META[type as VaultType]?.label ?? type}
                        </span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              </Reveal>

              <Reveal delay={0.16}>
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
              </Reveal>
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
