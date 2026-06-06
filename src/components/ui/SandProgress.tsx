import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SandProgressProps {
  value: number;
  showLabel?: boolean;
  label?: string;
  height?: string;
  className?: string;
}

export const SandProgress: React.FC<SandProgressProps> = ({
  value,
  showLabel = true,
  label,
  height,
  className,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));
  const displayLabel = label ?? `${Math.round(clampedValue)}%`;

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-sm text-parchment-200 font-medium">
            {displayLabel}
          </span>
        </div>
      )}
      <div
        className={cn('progress-sand', className)}
        style={height ? { height } : undefined}
      >
        <motion.div
          className="progress-sand-fill"
          initial={{ width: 0 }}
          animate={{ width: `${clampedValue}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
};

export default SandProgress;
