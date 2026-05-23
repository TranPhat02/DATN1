/**
 * PageWrapper — Framer Motion page transition wrapper
 */
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
};

export default function PageWrapper({ children }: { children: ReactNode }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
}
