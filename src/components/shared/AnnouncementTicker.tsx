import { usePlayerStore } from '@/store/playerStore';
import { cn } from '@/lib/utils';
import { Megaphone } from 'lucide-react';
import { rarityColors } from '@/data/config';
import type { Announcement } from '@/types';
import { formatRelativeTime } from '@/utils/helpers';

export default function AnnouncementTicker() {
  const { announcements } = usePlayerStore();

  const getTypeIcon = (type: Announcement['type']) => {
    switch (type) {
      case 'relic_found': return '🏺';
      case 'trade': return '💰';
      case 'exhibition': return '🏛️';
      case 'system': return '📢';
      default: return '📢';
    }
  };

  const getTypeColor = (rarity?: Announcement['rarity']) => {
    if (rarity && rarityColors[rarity]) {
      return rarityColors[rarity].text;
    }
    return 'text-parchment-200';
  };

  if (announcements.length === 0) {
    return (
      <div className="flex items-center gap-2 text-parchment-500 text-sm">
        <Megaphone size={14} />
        <span>暂无公告</span>
      </div>
    );
  }

  return (
    <div className="relative flex items-center w-full max-w-2xl h-8 overflow-hidden">
      <Megaphone size={14} className="flex-shrink-0 mr-2 text-bronze-400" />
      <div className="relative flex-1 h-full overflow-hidden">
        <div className="absolute w-full h-full flex items-center whitespace-nowrap animate-[scrollAnnouncement_30s_linear_infinite]">
          {[...announcements, ...announcements].map((announcement, idx) => (
            <span
              key={`${announcement.id}-${idx}`}
              className="inline-flex items-center gap-2 mr-16 text-sm"
            >
              <span>{getTypeIcon(announcement.type)}</span>
              <span className={cn('font-display font-medium', getTypeColor(announcement.rarity))}>
                {announcement.title}
              </span>
              <span className="text-parchment-400">—</span>
              <span className="text-parchment-300">{announcement.message}</span>
              <span className="text-parchment-500 text-xs ml-2">
                ({formatRelativeTime(announcement.timestamp)})
              </span>
            </span>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes scrollAnnouncement {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
