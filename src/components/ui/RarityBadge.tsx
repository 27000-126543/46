import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { rarityColors } from '../../data/config';
import type { Rarity } from '../../types';

type BadgeSize = 'sm' | 'md';

interface RarityBadgeProps {
  rarity: Rarity;
  size?: BadgeSize;
}

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-3 py-1 text-sm',
};

export const RarityBadge: React.FC<RarityBadgeProps> = ({ rarity, size = 'sm' }) => {
  const config = rarityColors[rarity];

  const gradientMap: Record<Rarity, string> = {
    common: 'from-gray-500 to-gray-600',
    rare: 'from-blue-500 to-blue-700',
    epic: 'from-purple-500 to-purple-700',
    legendary: 'from-amber-400 to-amber-600',
  };

  return (
    <motion.span
      whileHover={{ scale: 1.05 }}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-display font-semibold text-white bg-gradient-to-r shadow-sm',
        sizeClasses[size],
        gradientMap[rarity],
        rarity === 'legendary' && 'shadow-gold-glow',
      )}
    >
      {config.label}
    </motion.span>
  );
};

export default RarityBadge;
