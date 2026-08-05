'use client';

import { motion } from 'framer-motion';
import { AnimatedNumber } from '@/components/ui/animated-number';

interface Props {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
}

export function ScoreRing({ value, size = 150, stroke = 11, label = 'Security score' }: Props) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const color = clamped >= 80 ? 'hsl(152 60% 45%)' : clamped >= 50 ? 'hsl(38 92% 50%)' : 'hsl(0 72% 51%)';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--secondary))" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (clamped / 100) * c }}
          transition={{ duration: 1.2, ease: 'easeOut', delay: 0.1 }}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <AnimatedNumber value={clamped} className="text-4xl font-bold" />
        <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
