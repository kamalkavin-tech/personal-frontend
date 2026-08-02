'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity,
  Laptop,
  Loader2,
  MonitorSmartphone,
  ShieldCheck,
  ShieldOff,
  ShieldQuestion,
  Star,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DeviceInfo, SessionInfo } from '@vaultx/shared';
import { useAuth } from '@/context/auth-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useVaultEntries } from '@/lib/queries';
import { useDecryptedPayloads } from '@/hooks/use-decrypted';
import { analyzePasswords } from '@/lib/password';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress, Skeleton } from '@/components/ui/misc';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { PasswordGenerator } from '@/components/security/password-generator';
import { timeAgo } from '@/lib/utils';

export default function SecurityPage() {
  const { dek } = useAuth();
  const queryClient = useQueryClient();

  const { data: overview, refetch: refetchOverview } = useQuery({ queryKey: ['security'], queryFn: () => api.get<any>('/security/overview') });
  const { data: history } = useQuery({ queryKey: ['history'], queryFn: () => api.get<any[]>('/security/history') });
  const { data: audit } = useQuery({ queryKey: ['audit'], queryFn: () => api.get<any[]>('/security/audit') });
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: () => api.get<{ devices: DeviceInfo[] }>('/auth/devices').then((d) => d.devices) });
  const { data: sessions } = useQuery({ queryKey: ['sessions'], queryFn: () => api.get<{ sessions: SessionInfo[] }>('/auth/sessions').then((d) => d.sessions) });

  const { data: entries } = useVaultEntries('password');
  const passwordPayloads = useDecryptedPayloads(entries, dek);

  const health = useMemo(() => {
    if (!entries || !dek) return null;
    const list = entries
      .map((e) => {
        const p = passwordPayloads[e._id];
        if (!p) return null;
        return { title: p.title || e._id, username: (p.fields.username as string) || (p.fields.email as string), password: (p.fields.password as string) ?? '' };
      })
      .filter(Boolean) as Array<{ title: string; username?: string; password: string }>;
    return analyzePasswords(list);
  }, [entries, dek, passwordPayloads]);

  const score = overview?.score ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Security Center</h1>
        <p className="text-sm text-muted-foreground">Monitor your account health, sessions, devices and password strength.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="relative h-20 w-20">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" className="stroke-muted" strokeWidth="3.5" />
                <circle
                  cx="18"
                  cy="18"
                  r="15.9"
                  fill="none"
                  className={score >= 80 ? 'stroke-emerald-500' : score >= 50 ? 'stroke-amber-500' : 'stroke-red-500'}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 100} 100`}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">{score}</span>
            </div>
            <div>
              <p className="font-semibold">Security score</p>
              <p className="text-sm text-muted-foreground">
                {score >= 80 ? 'Excellent' : score >= 50 ? 'Needs attention' : 'At risk'} · {overview?.activeSessions ?? 0} active sessions
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">2FA status</p>
            <p className="mt-1 flex items-center gap-2 text-lg font-bold">
              {overview?.twoFactorEnabled ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-emerald-500" /> Enabled
                </>
              ) : (
                <>
                  <ShieldOff className="h-5 w-5 text-red-500" /> Disabled
                </>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{overview?.trustedDevices ?? 0} trusted devices · {overview?.failedLogins24h ?? 0} failed logins (24h)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm font-medium text-muted-foreground">Password health</p>
            {health ? (
              <div className="mt-2 space-y-1 text-sm">
                <p className="flex items-center justify-between">
                  <span>Weak passwords</span>
                  <Badge variant={health.weak.length ? 'destructive' : 'success'}>{health.weak.length}</Badge>
                </p>
                <p className="flex items-center justify-between">
                  <span>Duplicates</span>
                  <Badge variant={health.duplicate.length ? 'warning' : 'success'}>{health.duplicate.length}</Badge>
                </p>
                <p className="flex items-center justify-between">
                  <span>Reused</span>
                  <Badge variant={health.reused.length ? 'warning' : 'success'}>{health.reused.length}</Badge>
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">Unlock your vault to analyze passwords.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">2FA & sessions</TabsTrigger>
          <TabsTrigger value="passwords">Password health</TabsTrigger>
          <TabsTrigger value="generator">Generator</TabsTrigger>
          <TabsTrigger value="activity">Activity & audit</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <TwoFactorSection overview={overview} onChanged={() => refetchOverview()} />
          <DevicesSection devices={devices} queryClient={queryClient} />
          <SessionsSection sessions={sessions} queryClient={queryClient} />
        </TabsContent>

        <TabsContent value="passwords">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Password health</CardTitle>
              <CardDescription>Analyzed locally in your browser — your passwords never leave this device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!health ? (
                <p className="text-sm text-muted-foreground">Unlock your vault to analyze.</p>
              ) : (
                <>
                  <HealthList title="Weak passwords" entries={health.weak.map((w) => `${w.title}${w.username ? ` (${w.username})` : ''}`)} empty="No weak passwords 🎉" variant="destructive" />
                  <HealthList title="Duplicated passwords" entries={health.duplicate.map((d) => d.title)} empty="No duplicated passwords 🎉" variant="warning" />
                  <HealthList title="Reused passwords" entries={health.reused.map((r) => `${r.title} ×${r.count}`)} empty="No reused passwords 🎉" variant="warning" />
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="generator">
          <div className="max-w-lg">
            <PasswordGenerator />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Login history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!history?.length ? <p className="text-sm text-muted-foreground">No login events.</p> : history.map((e) => <EventRow key={e._id} event={e} />)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Audit log</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!audit?.length ? <p className="text-sm text-muted-foreground">No audit events.</p> : audit.map((e) => <AuditRow key={e._id} event={e} />)}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HealthList({ title, entries, empty, variant }: { title: string; entries: string[]; empty: string; variant: 'destructive' | 'warning' }) {
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {entries.map((e, i) => (
            <Badge key={i} variant={variant}>
              {e}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ event }: { event: any }) {
  const icon = event.type === 'failed' ? <ShieldOff className="h-4 w-4 text-destructive" /> : event.type === '2fa' ? <ShieldQuestion className="h-4 w-4 text-amber-500" /> : <Activity className="h-4 w-4 text-emerald-500" />;
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
      {icon}
      <div className="flex-1 capitalize">{event.type}</div>
      <div className="text-xs text-muted-foreground">{event.ip ?? 'unknown'}</div>
      <div className="text-xs text-muted-foreground">{timeAgo(event.createdAt)}</div>
    </div>
  );
}

function AuditRow({ event }: { event: any }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border p-3 text-sm">
      <code className="flex-1 text-xs">{event.action}</code>
      <span className="text-xs text-muted-foreground">{timeAgo(event.createdAt)}</span>
    </div>
  );
}

function TwoFactorSection({ overview, onChanged }: { overview: any; onChanged: () => void }) {
  const [loading, setLoading] = useState(false);
  const [setup, setSetup] = useState<null | { secret: string; qr: string }>(null);
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [disableCode, setDisableCode] = useState('');
  const [disableDialog, setDisableDialog] = useState(false);

  const startSetup = async () => {
    setLoading(true);
    try {
      const data = await api.post<{ secret: string; otpauthUrl: string; qrDataUrl: string }>('/auth/2fa/setup');
      setSetup({ secret: data.secret, qr: data.qrDataUrl });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  const verifySetup = async () => {
    if (!setup) return;
    if (!/^\d{6}$/.test(code)) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      const result = await api.post<{ backupCodes: string[] }>('/auth/2fa/verify-setup', { secret: setup.secret, code });
      setBackupCodes(result.backupCodes);
      setSetup(null);
      setCode('');
      onChanged();
      toast.success('Two-factor authentication enabled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { code: disableCode });
      setDisableDialog(false);
      setDisableCode('');
      onChanged();
      toast.success('Two-factor authentication disabled');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  if (backupCodes) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Save your backup codes</CardTitle>
          <CardDescription>Store these somewhere safe. Each can be used once to sign in if you lose your authenticator.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {backupCodes.map((c) => (
              <code key={c} className="rounded-lg bg-muted p-2 text-center font-mono text-sm">
                {c}
              </code>
            ))}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              import('@/lib/utils').then(({ downloadBlob }) => downloadBlob(new Blob([backupCodes.join('\n')], { type: 'text/plain' }), 'vaultx-2fa-backup-codes.txt'));
            }}
          >
            Download codes
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Two-factor authentication</CardTitle>
        <CardDescription>{overview?.twoFactorEnabled ? 'Your account is protected with 2FA.' : 'Add an extra layer of security with an authenticator app.'}</CardDescription>
      </CardHeader>
      <CardContent>
        {!overview?.twoFactorEnabled && !setup && (
          <Button onClick={startSetup} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Enable 2FA
          </Button>
        )}

        {setup && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col items-center gap-3">
              <div className="rounded-xl bg-white p-4">
                <QRCodeSVG value={setup.qr} size={180} />
              </div>
              <p className="text-center text-xs text-muted-foreground">Scan with Google Authenticator, Authy, or 1Password.</p>
              <p className="text-center text-xs">
                Or enter manually: <code className="rounded bg-muted px-2 py-0.5">{setup.secret}</code>
              </p>
            </div>
            <div className="space-y-3">
              <Label htmlFor="2fa-code">Verification code</Label>
              <Input id="2fa-code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
              <Button onClick={verifySetup} disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Verify & enable
              </Button>
            </div>
          </div>
        )}

        {overview?.twoFactorEnabled && (
          <div className="space-y-4">
            <Badge variant="success" className="gap-1">
              <ShieldCheck className="h-3 w-3" /> Enabled
            </Badge>
            <div>
              <Button variant="destructive" onClick={() => setDisableDialog(true)}>
                Disable 2FA
              </Button>
            </div>
            {disableDialog && (
              <div className="max-w-xs space-y-2">
                <Label htmlFor="disable-code">Enter a code to confirm</Label>
                <Input id="disable-code" inputMode="numeric" maxLength={6} value={disableCode} onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, ''))} placeholder="••••••" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setDisableDialog(false)}>
                    Cancel
                  </Button>
                  <Button variant="destructive" onClick={disable} disabled={loading}>
                    Disable
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DevicesSection({ devices, queryClient }: { devices: DeviceInfo[] | undefined; queryClient: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Devices</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {!devices ? (
          <Skeleton className="h-10" />
        ) : devices.length === 0 ? (
          <p className="text-sm text-muted-foreground">No devices.</p>
        ) : (
          devices.map((device) => (
            <div key={device._id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <MonitorSmartphone className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{device.name}</p>
                <p className="text-xs text-muted-foreground">
                  {device.platform} · last seen {timeAgo(device.lastSeenAt)}
                </p>
              </div>
              <Button
                variant={device.trusted ? 'secondary' : 'outline'}
                size="sm"
                onClick={async () => {
                  await api.patch(`/auth/devices/${device._id}/trust`, { trusted: !device.trusted });
                  queryClient.invalidateQueries({ queryKey: ['devices'] });
                  toast.success(device.trusted ? 'Device untrusted' : 'Device trusted');
                }}
              >
                <Star className="h-3.5 w-3.5" /> {device.trusted ? 'Trusted' : 'Trust'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive"
                onClick={async () => {
                  await api.delete(`/auth/devices/${device._id}`);
                  queryClient.invalidateQueries({ queryKey: ['devices'] });
                  toast.success('Device revoked');
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function SessionsSection({ sessions, queryClient }: { sessions: SessionInfo[] | undefined; queryClient: any }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sessions</CardTitle>
        <CardDescription>Sign out of any device, anywhere.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {!sessions ? (
          <Skeleton className="h-10" />
        ) : sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sessions.</p>
        ) : (
          sessions.map((session) => (
            <div key={session._id} className="flex items-center gap-3 rounded-lg border p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                <Laptop className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {session.deviceName ?? 'Browser'} {session.current && <Badge className="ml-1">This device</Badge>}
                </p>
                <p className="text-xs text-muted-foreground">
                  {session.ip} · signed in {timeAgo(session.createdAt)} · expires {timeAgo(session.expiresAt)}
                </p>
              </div>
              {!session.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={async () => {
                    await api.delete(`/auth/sessions/${session._id}`);
                    queryClient.invalidateQueries({ queryKey: ['sessions'] });
                    toast.success('Session revoked');
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" /> Sign out
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
