'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, Loader2, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [devToken, setDevToken] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post<{ token?: string }>('/auth/forgot-password', { email });
      setDevToken(data.token);
      setSent(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Reset master password</CardTitle>
          <CardDescription>We'll send you a reset link to your email.</CardDescription>
        </CardHeader>
        {!sent ? (
          <form onSubmit={submit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  Because your data is encrypted with your master password (zero-trust), resetting it means your existing vault items cannot be decrypted. You will start with a fresh vault.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                {loading ? 'Sending…' : 'Send reset link'}
              </Button>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">A reset link was sent to <span className="font-medium text-foreground">{email}</span>.</p>
            {devToken && (
              <div className="space-y-2 rounded-lg border p-3">
                <p className="text-xs font-medium text-muted-foreground">Development token (not emailed in production):</p>
                <code className="block break-all rounded bg-muted p-2 text-xs">{devToken}</code>
                <Link
                  href={`/reset-password?token=${encodeURIComponent(devToken)}`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  Continue to reset
                </Link>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}
