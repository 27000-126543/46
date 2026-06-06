import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Megaphone } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { Announcement } from '../../types';

interface AnnouncementTickerProps {
  announcements: Announcement[];
}

export const AnnouncementTicker: React.FC<AnnouncementTickerProps> = ({
  announcements,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showNew, setShowNew] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (announcements.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length);
      setShowNew(true);
      setTimeout(() => setShowNew(false), 500);
    }, 5000);

    return () => clearInterval(interval);
  }, [announcements.length]);

  if (announcements.length === 0) {
    return (
      <div className="w-full bg-parchment-900/60 border border-bronze-700/30 rounded-lg px-4 py-2 flex items-center gap-2 text-parchment-500">
        <Megaphone className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">暂无公告</span>
      </div>
    );
  }

  const current = announcements[currentIndex];
  const isGoldHighlight = current.rarity === 'legendary' || current.rarity === 'epic';

  return (
    <div
      ref={tickerRef}
      className={cn(
        'relative w-full overflow-hidden rounded-lg border px-4 py-2.5',
        isGoldHighlight
          ? 'bg-gradient-to-r from-amber-950/60 via-parchment-900/80 to-amber-950/60 border-bronze-500/50'
          : 'bg-parchment-900/60 border-bronze-700/30',
      )}
    >
      <div className="flex items-center gap-3">
        <div className="relative flex-shrink-0">
          <Bell
            className={cn(
              'w-5 h-5',
              isGoldHighlight ? 'text-bronze-300' : 'text-bronze-400',
            )}
          />
          <AnimatePresence>
            {showNew && (
              <motion.span
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-parchment-900"
              />
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              initial={{ x: '100%', opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: '-100%', opacity: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="whitespace-nowrap overflow-hidden text-ellipsis"
            >
              <span
                className={cn(
                  'font-display font-semibold mr-2',
                  isGoldHighlight ? 'text-bronze-300' : 'text-parchment-200',
                )}
              >
                【{current.title}】
              </span>
              <span
                className={cn(
                  isGoldHighlight ? 'text-amber-200 gold-text' : 'text-parchment-300',
                )}
              >
                {current.message}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex-shrink-0 flex gap-1">
          {announcements.slice(0, 5).map((_, i) => (
            <div
              key={i}
              className={cn(
                'w-1.5 h-1.5 rounded-full transition-all',
                i === currentIndex
                  ? 'bg-bronze-400 w-4'
                  : 'bg-parchment-600',
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default AnnouncementTicker;
