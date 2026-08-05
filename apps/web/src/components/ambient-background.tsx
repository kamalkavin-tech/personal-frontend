'use client';

import { motion } from 'framer-motion';

const ORBS: { className: string; x: number[]; y: number[]; duration: number }[] = [
  {
    className: 'left-[12%] top-[-12%] h-[34rem] w-[34rem] bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.32),transparent_68%)]',
    x: [0, 140, -60, 0],
    y: [0, 60, 120, 0],
    duration: 26,
  },
  {
    className: 'right-[8%] top-[22%] h-[30rem] w-[30rem] bg-[radial-gradient(circle_at_center,hsl(265_85%_68%/0.24),transparent_68%)]',
    x: [0, -120, 40, 0],
    y: [0, 90, -40, 0],
    duration: 32,
  },
  {
    className: 'bottom-[-14%] left-[30%] h-[38rem] w-[38rem] bg-[radial-gradient(circle_at_center,hsl(190_85%_60%/0.2),transparent_68%)]',
    x: [0, 90, -120, 0],
    y: [0, -70, 30, 0],
    duration: 38,
  },
  {
    className: 'left-[-8%] bottom-[8%] h-[26rem] w-[26rem] bg-[radial-gradient(circle_at_center,hsl(155_70%_55%/0.18),transparent_68%)]',
    x: [0, 110, 20, 0],
    y: [0, -50, 90, 0],
    duration: 29,
  },
];

const NOISE =
  'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'180\' height=\'180\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'2\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.4\'/%3E%3C/svg%3E")';

export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0" style={{ backgroundColor: 'hsl(var(--background))' }} />
      <div
        className="absolute inset-0 opacity-50 [background:radial-gradient(70%_60%_at_50%_-10%,hsl(var(--primary)/0.12),transparent_70%)]"
      />
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full blur-3xl ${orb.className}`}
          animate={{ x: orb.x, y: orb.y }}
          transition={{ duration: orb.duration, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <div className="absolute inset-0 opacity-[0.35] mix-blend-soft-light" style={{ backgroundImage: NOISE }} />
      <div className="absolute inset-0 [background:radial-gradient(120%_120%_at_50%_50%,transparent_60%,hsl(var(--background)/0.5))]" />
    </div>
  );
}
