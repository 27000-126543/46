import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface StatBarProps {
  label: string;
  value: number;
  max: number;
  color?: string;
  icon?: React.ReactNode;
  showValue?: boolean;
}

export const StatBar: React.FC<StatBarProps> = ({
  label,
  value,
  max,
  color = 'from-bronze-500',
  icon,
  showValue = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {icon && <span className="text-bronze-300">{icon}</span>}
          <span className="text-sm text-parchment-200 font-medium">{label}</span>
        </div>
        {showValue && (
          <span className="text-sm text-parchment-300 font-mono">
            {value}
            <span className="text-parchment-500">/{max}</span>
          </span>
        )}
      </div>
      <div className="w-full h-2 bg-parchment-900 rounded-full overflow-hidden border border-bronze-700/30">
        <motion.div
          className={cn('h-full rounded-full bg-gradient-to-r', color)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default StatBar;
