'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/auth-context';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/misc';
import { passwordStrength } from '@/lib/password';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  const strength = passwordStrength(password);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (strength.score < 2) {
      toast.error('Please choose a stronger master password');
      return;
    }
    setLoading(true);
    try {
      await register({ email, name: name || undefined, masterPassword: password });
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create your vault</CardTitle>
          <CardDescription>Everything you save is encrypted locally before it reaches our servers.</CardDescription>
        </CardHeader>
        <form onSubmit={submit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name (optional)</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mp">Master password</Label>
              <div className="relative">
                <Input id="mp" type={show ? 'text' : 'password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="space-y-1">
                  <Progress value={strength.percent} className="h-1.5" />
                  <p className="text-xs text-muted-foreground">
                    Strength: <span className="font-medium">{strength.label}</span> — if you lose this password, your data cannot be recovered.
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm master password</Label>
              <Input id="confirm" type={show ? 'text' : 'password'} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat your password" autoComplete="new-password" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {loading ? 'Creating encrypted vault…' : 'Create account'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
