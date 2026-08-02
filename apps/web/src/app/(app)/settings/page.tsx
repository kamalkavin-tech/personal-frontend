'use client';

import { useState } from 'react';
import { KeyRound, Loader2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { api, getAccessToken, setAccessToken } from '@/lib/api';
import { deriveKeys } from '@/lib/crypto';
import { passwordStrength } from '@/lib/password';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/misc';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function SettingsPage() {
  const { user, changeMasterPassword, refreshUser, logout } = useAuth();
  const router = useRouter();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [changing, setChanging] = useState(false);

  const strength = next ? passwordStrength(next) : null;

  const changePassword = async () => {
    if (next.length < 8) {
      toast.error('New master password must be at least 8 characters');
      return;
    }
    if (next !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setChanging(true);
    try {
      await changeMasterPassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      toast.success('Master password changed');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setChanging(false);
    }
  };

  const [name, setName] = useState(user?.name ?? '');
  const [savingName, setSavingName] = useState(false);

  const saveName = async () => {
    setSavingName(true);
    try {
      await api.patch('/auth/me', { name });
      await refreshUser();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setSavingName(false);
    }
  };

  const [delPassword, setDelPassword] = useState('');
  const [deleting, setDeleting] = useState(false);

  const deleteAccount = async () => {
    if (!user) return;
    if (!delPassword) {
      toast.error('Enter your master password');
      return;
    }
    setDeleting(true);
    try {
      const { authKeyHex } = await deriveKeys(delPassword, user.kekSalt, user.authSalt, user.iterations);
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/account`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: 'include',
        body: JSON.stringify({ authKey: authKeyHex }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message ?? 'Failed to delete account');
      }
      setAccessToken(null);
      toast.success('Account deleted. Goodbye 👋');
      await logout();
      router.replace('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete account');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your profile and master password.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="h-4 w-4" /> Profile
          </CardTitle>
          <CardDescription>Your display name is stored on the server.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ''} disabled />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          </div>
          <Button onClick={saveName} disabled={savingName}>
            {savingName && <Loader2 className="h-4 w-4 animate-spin" />} Save
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4" /> Master password
          </CardTitle>
          <CardDescription>
            Changing your master password re-encrypts your data encryption key on this device and updates it on the server. Your data stays encrypted throughout.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="current">Current master password</Label>
            <Input id="current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="next">New master password</Label>
            <Input id="next" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
            {strength && (
              <div className="flex items-center gap-2">
                <Progress value={strength.percent} className="flex-1" />
                <span className="text-xs text-muted-foreground">{strength.label}</span>
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="confirm">Confirm new master password</Label>
            <Input id="confirm" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <Button onClick={changePassword} disabled={changing}>
            {changing && <Loader2 className="h-4 w-4 animate-spin" />} Change master password
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger zone</CardTitle>
          <CardDescription>Deleting your account permanently erases your vault, files and backups from the server. This cannot be undone.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2">
            <Label htmlFor="del-password">Confirm with your master password</Label>
            <Input id="del-password" type="password" value={delPassword} onChange={(e) => setDelPassword(e.target.value)} placeholder="Master password" />
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">Delete account</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently deletes all encrypted data, files, and backups from the server. Make sure you have a backup before continuing.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount} disabled={deleting}>
                  {deleting && <Loader2 className="h-4 w-4 animate-spin" />} Delete forever
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
