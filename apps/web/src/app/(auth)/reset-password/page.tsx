'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { KeyRound, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/misc';
import { randomSalt, deriveKeys, generateDEK, wrapDEK } from '@/lib/crypto';
import { passwordStrength } from '@/lib/password';

const ITERATIONS = 600_000;

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('Missing reset token');
      return;
    }
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const kekSalt = randomSalt();
      const authSalt = randomSalt();
      const { kek, authKeyHex } = await deriveKeys(password, kekSalt, authSalt, ITERATIONS);
      const newDEK = await generateDEK();
      const wrapped = await wrapDEK(newDEK, kek);
      await api.post('/auth/reset-password', {
        token,
        newAuthKey: authKeyHex,
        newKekSalt: kekSalt,
        newAuthSalt: authSalt,
        newIterations: ITERATIONS,
        newWrappedDEK: JSON.stringify(wrapped),
      });
      toast.success('Master password reset. Your old data was wiped as it can no longer be decrypted.');
      router.push('/login');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Choose a new master password</CardTitle>
          <CardDescription>This generates a brand-new encryption key for a fresh vault.</CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="np">New master password</Label>
              <Input id="np" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
              {password && (
                <div className="space-y-1">
                  <Progress value={strength.percent} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">Strength: {strength.label}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nc">Confirm new master password</Label>
              <Input id="nc" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading || !token}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {loading ? 'Resetting…' : 'Reset password'}
            </Button>
            <p className="text-sm text-muted-foreground">
              <Link href="/login" className="font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
