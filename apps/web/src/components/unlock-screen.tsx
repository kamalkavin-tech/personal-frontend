'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function UnlockScreen() {
  const { unlock, logout, user } = useAuth();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await unlock(password);
    } catch {
      toast.error('Unable to unlock. Check your master password.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              <KeyRound className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>Unlock your vault</CardTitle>
            <CardDescription>
              Signed in as <span className="font-medium text-foreground">{user?.email}</span>. Enter your master password to decrypt your data locally.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="unlock-password">Master password</Label>
                <Input id="unlock-password" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••" />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !password}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {loading ? 'Unlocking…' : 'Unlock vault'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={async () => {
                  await logout();
                  router.push('/');
                }}
              >
                Sign out
              </Button>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
