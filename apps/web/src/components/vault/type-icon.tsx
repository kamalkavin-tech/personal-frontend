import {
  KeyRound,
  StickyNote,
  CreditCard,
  IdCard,
  Braces,
  ShieldQuestion,
  BookHeart,
  MapPin,
  Users,
  Globe,
  Lock,
} from 'lucide-react';
import type { VaultType } from '@vaultx/shared';
import { cn } from '@/lib/utils';

const MAP: Record<VaultType, { icon: React.ElementType; color: string }> = {
  login: { icon: Globe, color: 'text-sky-500 bg-sky-500/10' },
  password: { icon: KeyRound, color: 'text-violet-500 bg-violet-500/10' },
  note: { icon: StickyNote, color: 'text-amber-500 bg-amber-500/10' },
  card: { icon: CreditCard, color: 'text-emerald-500 bg-emerald-500/10' },
  identity: { icon: IdCard, color: 'text-rose-500 bg-rose-500/10' },
  apiKey: { icon: Braces, color: 'text-cyan-500 bg-cyan-500/10' },
  secret: { icon: ShieldQuestion, color: 'text-fuchsia-500 bg-fuchsia-500/10' },
  journal: { icon: BookHeart, color: 'text-pink-500 bg-pink-500/10' },
  address: { icon: MapPin, color: 'text-orange-500 bg-orange-500/10' },
  contact: { icon: Users, color: 'text-teal-500 bg-teal-500/10' },
};

export function TypeIcon({ type, className, size = 'h-5 w-5' }: { type: VaultType; className?: string; size?: string }) {
  const { icon: Icon, color } = MAP[type];
  return (
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', color, className)}>
      <Icon className={size} />
    </span>
  );
}

export function VaultIcon({ type }: { type: VaultType }) {
  const { icon: Icon, color } = MAP[type];
  return <Icon className={cn('h-4 w-4', color.split(' ')[0])} />;
}
