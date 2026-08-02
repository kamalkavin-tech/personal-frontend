'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/misc';

export default function OtpPage() {
  return (
    <Suspense fallback={null}>
      <OtpContent />
    </Suspense>
  );
}

function OtpContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email') ?? '';
  const { loginWithCode } = useAuth();
  const [code, setCode] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await loginWithCode(email, code, remember);
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Invalid code');
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>Two-factor verification</CardTitle>
          <CardDescription>
            Enter the 6-digit code from your authenticator app {email && <>for <span className="font-medium text-foreground">{email}</span></>}.
          </CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Authentication code</Label>
              <Input
                ref={inputRef}
                id="code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="text-center text-2xl font-bold tracking-[0.5em]"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="remember" checked={remember} onCheckedChange={(c) => setRemember(c === true)} />
              <label htmlFor="remember" className="text-sm text-muted-foreground">
                Trust this device
              </label>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Verifying…' : 'Verify & unlock'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
