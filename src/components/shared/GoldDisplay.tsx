import { Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatGold } from '@/utils/helpers';

interface GoldDisplayProps {
  amount: number;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: {
    icon: 14,
    text: 'text-sm',
    gap: 'gap-1'
  },
  md: {
    icon: 18,
    text: 'text-base',
    gap: 'gap-1.5'
  },
  lg: {
    icon: 22,
    text: 'text-lg',
    gap: 'gap-2'
  }
};

export default function GoldDisplay({ amount, showIcon = true, size = 'md' }: GoldDisplayProps) {
  const config = sizeConfig[size];

  return (
    <div className={cn('inline-flex items-center', config.gap)}>
      {showIcon && (
        <Coins
          size={config.icon}
          className="text-bronze-400 drop-shadow-[0_0_4px_rgba(212,175,55,0.5)] flex-shrink-0"
        />
      )}
      <span
        className={cn(
          'font-mono font-semibold text-bronze-300',
          config.text,
          'relative inline-block'
        )}
      >
        <span className="relative">
          {formatGold(amount)}
          <span className="absolute inset-0 bg-gradient-to-r from-transparent via-bronze-200/40 to-transparent bg-[length:200%_100%] animate-shimmer bg-clip-text text-transparent pointer-events-none" />
        </span>
      </span>
    </div>
  );
}
