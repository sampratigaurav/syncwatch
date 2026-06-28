import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  className?: string;
}

export function EmptyState({ icon, title, description, className }: EmptyStateProps) {
  return (
    <div className={cn("w-full flex flex-col items-center justify-center p-8 text-center", className)}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative mb-6"
      >
        <div className="absolute inset-0 bg-teal-500/20 blur-xl rounded-full" />
        <div className="relative w-20 h-20 bg-zinc-900/80 border border-white/5 rounded-2xl flex items-center justify-center text-teal-500 shadow-xl backdrop-blur-sm">
          <motion.div
            animate={{ 
              y: [0, -8, 0],
            }}
            transition={{ 
              duration: 4, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {icon}
          </motion.div>
        </div>
      </motion.div>
      <h3 className="text-lg font-semibold text-zinc-200 mb-2">{title}</h3>
      <p className="text-sm text-zinc-500 max-w-[250px] leading-relaxed">{description}</p>
    </div>
  );
}
