import React from 'react';
import { motion } from 'framer-motion';
import { Archive } from 'lucide-react';
import { cn } from '../../lib/utils';
import BronzeButton from './BronzeButton';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: () => void;
  actionText?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  actionText,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center py-12 px-6 text-center"
    >
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="mb-6 text-bronze-400"
      >
        {icon ?? <Archive className="w-16 h-16" />}
      </motion.div>

      <h3 className="text-xl font-display font-semibold text-parchment-100 mb-2">
        {title}
      </h3>

      {description && (
        <p className="text-parchment-400 text-base max-w-md mb-6">
          {description}
        </p>
      )}

      {action && actionText && (
        <BronzeButton onClick={action} variant="primary">
          {actionText}
        </BronzeButton>
      )}
    </motion.div>
  );
};

export default EmptyState;
