'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      className={cn(className)}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.5, delay, ease: [0.21, 1.02, 0.73, 1] }}
    >
      {children}
    </motion.div>
  );
}
