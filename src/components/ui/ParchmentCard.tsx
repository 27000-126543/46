import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface ParchmentCardProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
}

export const ParchmentCard: React.FC<ParchmentCardProps> = ({
  children,
  title,
  subtitle,
  icon,
  className,
  footer,
  headerRight,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn('card-parchment border-decorated p-6', className)}
    >
      {(title || icon || headerRight) && (
        <div className="flex items-start justify-between mb-4 pb-4 border-b border-bronze-700/30">
          <div className="flex items-center gap-3">
            {icon && <span className="text-bronze-300">{icon}</span>}
            <div>
              {title && (
                <h3 className="text-xl font-display font-semibold text-parchment-50">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-parchment-300 mt-1">{subtitle}</p>
              )}
            </div>
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      )}

      <div className="relative z-10">{children}</div>

      {footer && (
        <div className="mt-4 pt-4 border-t border-bronze-700/30">{footer}</div>
      )}
    </motion.div>
  );
};

export default ParchmentCard;
