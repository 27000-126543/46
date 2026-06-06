import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Coins, ScrollText } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Relic } from '../../types';
import RarityBadge from './RarityBadge';
import SandProgress from './SandProgress';

type RelicCardSize = 'sm' | 'md' | 'lg';

interface RelicCardProps {
  relic: Relic;
  onClick?: () => void;
  selected?: boolean;
  size?: RelicCardSize;
  showStats?: boolean;
}

const sizeClasses: Record<RelicCardSize, string> = {
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

const imageSizeClasses: Record<RelicCardSize, string> = {
  sm: 'h-20',
  md: 'h-32',
  lg: 'h-48',
};

export const RelicCard: React.FC<RelicCardProps> = ({
  relic,
  onClick,
  selected = false,
  size = 'md',
  showStats = true,
}) => {
  const rarityClass = `relic-rarity-${relic.rarity}`;

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.03, y: -4 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'card-parchment border-2 cursor-pointer transition-all duration-300',
        sizeClasses[size],
        rarityClass,
        selected && 'ring-2 ring-bronze-400 ring-offset-2 ring-offset-parchment-950 scale-[1.02]',
      )}
    >
      <div className="relative mb-3">
        <div
          className={cn(
            'w-full rounded-lg overflow-hidden bg-parchment-900 border border-bronze-700/30',
            imageSizeClasses[size],
          )}
        >
          {relic.image ? (
            <img
              src={relic.image}
              alt={relic.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-bronze-500">
              <ScrollText className="w-10 h-10" />
            </div>
          )}
        </div>
        <div className="absolute top-2 right-2">
          <RarityBadge rarity={relic.rarity} size="sm" />
        </div>
      </div>

      <div className="mb-2">
        <h4
          className={cn(
            'font-display font-semibold text-parchment-50 truncate',
            size === 'sm' ? 'text-sm' : size === 'md' ? 'text-base' : 'text-lg',
          )}
        >
          {relic.name}
        </h4>
        {size !== 'sm' && (
          <p className="text-xs text-parchment-400 mt-0.5">
            {relic.civilization}
          </p>
        )}
      </div>

      {showStats && (
        <div className="space-y-2">
          <SandProgress value={relic.completeness} label={`完整度 ${relic.completeness}%`} />

          {size === 'lg' && (
            <>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-parchment-300">
                  <Sparkles className="w-4 h-4 text-bronze-400" />
                  <span>历史价值</span>
                </div>
                <span className="font-mono text-parchment-100">
                  {relic.historicalValue.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-parchment-300">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>估价</span>
                </div>
                <span className="font-mono text-bronze-300">
                  ¥{relic.estimatedPrice.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default RelicCard;
