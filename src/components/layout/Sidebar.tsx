import { NavLink } from 'react-router-dom';
import {
  Home,
  Users,
  Compass,
  Scroll,
  Building2,
  Store,
  Trophy,
  Lock,
  Coins,
  Star
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { formatGold } from '@/utils/helpers';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', label: '总览', icon: Home },
  { to: '/team', label: '考古队', icon: Users },
  { to: '/explore', label: '遗迹探索', icon: Compass },
  { to: '/relics', label: '文物收藏', icon: Scroll },
  { to: '/museum', label: '博物馆', icon: Building2 },
  { to: '/market', label: '交易市场', icon: Store },
  { to: '/ranking', label: '排行榜', icon: Trophy },
  { to: '/secret', label: '秘境遗迹', icon: Lock },
];

export default function Sidebar() {
  const { player } = usePlayerStore();

  return (
    <aside className="relative flex flex-col h-screen w-64 flex-shrink-0 bg-gradient-to-b from-parchment-950 via-parchment-900 to-parchment-950 border-r border-bronze-700/40 overflow-hidden">
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{
          backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(212, 175, 55, 0.1) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(139, 105, 20, 0.15) 0%, transparent 40%)
          `
        }}
      />
      <div className="absolute inset-0 bg-noise opacity-50 pointer-events-none" />

      <div className="relative z-10 px-6 py-6 border-b border-bronze-700/30">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-lg bg-bronze-emboss flex items-center justify-center shadow-bronze-emboss border border-bronze-400/30">
            <span className="text-xl">🏺</span>
            <div className="absolute -inset-0.5 rounded-lg bg-gold-shimmer opacity-0 animate-pulse-gold" />
          </div>
          <div className="flex flex-col">
            <span className="font-display font-bold text-lg bg-gold-shimmer bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer tracking-wider">
              考古纪元
            </span>
            <span className="font-body text-xs text-parchment-400 tracking-[0.3em] uppercase">
              Archaeo Era
            </span>
          </div>
        </div>
      </div>

      <nav className="relative z-10 flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'relative group flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300',
                'font-display tracking-wide text-sm',
                isActive
                  ? 'bg-gradient-to-r from-bronze-600/40 via-bronze-500/20 to-transparent text-bronze-200 shadow-[0_0_12px_rgba(212,175,55,0.15)]'
                  : 'text-parchment-300 hover:bg-parchment-800/40 hover:text-parchment-100'
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-r-full bg-gradient-to-b from-bronze-300 via-bronze-400 to-bronze-600 shadow-[0_0_8px_rgba(212,175,55,0.6)]" />
                )}
                <Icon
                  size={18}
                  className={cn(
                    'transition-all duration-300 flex-shrink-0',
                    isActive ? 'text-bronze-300 drop-shadow-[0_0_4px_rgba(212,175,55,0.5)]' : 'text-parchment-400 group-hover:text-parchment-200'
                  )}
                />
                <span className={cn(isActive && 'gold-text')}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="relative z-10 px-4 py-4 border-t border-bronze-700/30 bg-gradient-to-t from-parchment-950/80 to-transparent">
        <div className="p-3 rounded-lg bg-parchment-900/60 border border-bronze-700/30 backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-bronze-emboss flex items-center justify-center text-xl border-2 border-bronze-400/40 shadow-bronze-emboss">
                {player.avatar}
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-bronze-400 to-bronze-600 border border-parchment-950 flex items-center justify-center">
                <span className="text-[10px] font-bold text-parchment-50">{player.level}</span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-semibold text-sm text-parchment-100 truncate">
                {player.name}
              </div>
              <div className="flex items-center gap-1 text-xs text-parchment-400">
                <Star size={10} className="text-bronze-400" />
                <span>Lv.{player.level} 考古学家</span>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Coins size={14} className="text-bronze-400 drop-shadow-[0_0_4px_rgba(212,175,55,0.4)]" />
              <span className="font-mono text-sm text-bronze-300 font-semibold">
                {formatGold(player.gold)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm">💎</span>
              <span className="font-mono text-sm text-parchment-200 font-semibold">
                {player.gems}
              </span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
