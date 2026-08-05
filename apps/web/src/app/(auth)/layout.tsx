import { ShieldCheck } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.18),transparent_70%)]" />
      <div className="relative z-10 flex w-full max-w-md flex-col items-center">
        <div className="animate-float mb-6 flex items-center gap-2">
          <div className="animate-pulse-ring flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-sm font-bold text-primary-foreground">V</div>
          <span className="text-gradient text-lg font-bold tracking-tight">VaultX</span>
          <span className="ml-1 flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
            <ShieldCheck className="h-3 w-3" /> Zero-trust
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
