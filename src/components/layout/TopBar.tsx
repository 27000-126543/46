import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ChevronDown,
  Settings,
  LogOut,
  User,
  Gem,
  Sparkles
} from 'lucide-react';
import { usePlayerStore } from '@/store/playerStore';
import { gameConfig } from '@/data/config';
import { cn } from '@/lib/utils';
import AnnouncementTicker from '@/components/shared/AnnouncementTicker';
import GoldDisplay from '@/components/shared/GoldDisplay';

const pageTitles: Record<string, { title: string; subtitle?: string }> = {
  '/': { title: '总览', subtitle: '欢迎回到考古纪元' },
  '/team': { title: '考古队', subtitle: '管理你的探险队伍' },
  '/explore': { title: '遗迹探索', subtitle: '踏上未知的冒险' },
  '/relics': { title: '文物收藏', subtitle: '稀世珍宝一览' },
  '/museum': { title: '博物馆', subtitle: '展示你的收藏' },
  '/market': { title: '交易市场', subtitle: '文物买卖与拍卖' },
  '/ranking': { title: '排行榜', subtitle: '与各路考古学家一较高下' },
  '/secret': { title: '秘境遗迹', subtitle: '传说中的神秘之地' },
};

export default function TopBar() {
  const location = useLocation();
  const { player } = usePlayerStore();
  const [menuOpen, setMenuOpen] = useState(false);

  const pathKey = Object.keys(pageTitles).find((path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  }) || '/';

  const pageInfo = pageTitles[pathKey];
  const expNeeded = gameConfig.expPerLevel * Math.pow(gameConfig.levelExpMultiplier, player.level - 1);
  const expPercent = Math.min((player.exp / expNeeded) * 100, 100);

  return (
    <header className="relative z-20 h-16 flex-shrink-0 bg-gradient-to-r from-parchment-950 via-parchment-900 to-parchment-950 border-b border-bronze-500/40">
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(90deg, transparent 0%, rgba(212, 175, 55, 0.06) 50%, transparent 100%)
          `
        }}
      />
      <div className="absolute inset-0 bg-noise opacity-30 pointer-events-none" />

      <div className="relative z-10 h-full flex items-center justify-between px-6">
        <div className="flex items-center gap-4 min-w-0 flex-shrink-0">
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-bronze-600/50 to-transparent" />
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg text-parchment-100 tracking-wide truncate">
              {pageInfo.title}
            </h1>
            {pageInfo.subtitle && (
              <p className="text-xs text-parchment-400 font-body truncate">
                {pageInfo.subtitle}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 flex justify-center px-4 max-w-3xl mx-4 overflow-hidden">
          <AnnouncementTicker />
        </div>

        <div className="flex items-center gap-5 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-4">
            <GoldDisplay amount={player.gold} size="sm" />
            <div className="flex items-center gap-1.5">
              <Gem size={14} className="text-ruin-300 flex-shrink-0" />
              <span className="font-mono text-sm text-ruin-200 font-semibold">
                {player.gems}
              </span>
            </div>
            <div className="flex items-center gap-2 w-32">
              <Sparkles size={14} className="text-bronze-400 flex-shrink-0" />
              <div className="flex-1 h-2 bg-parchment-800 rounded-full overflow-hidden border border-bronze-700/40">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${expPercent}%`,
                    background: 'linear-gradient(90deg, #8B6914 0%, #D4AF37 50%, #8B6914 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'sandFlow 3s linear infinite'
                  }}
                />
              </div>
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 p-1.5 pr-3 rounded-lg bg-parchment-900/60 border border-bronze-700/40 hover:border-bronze-500/60 hover:bg-parchment-800/60 transition-all duration-300 group"
            >
              <div className="w-8 h-8 rounded-lg bg-bronze-emboss flex items-center justify-center text-base border border-bronze-400/30 shadow-bronze-emboss">
                {player.avatar}
              </div>
              <div className="hidden sm:flex flex-col items-start">
                <span className="font-display text-sm text-parchment-100 font-semibold leading-none">
                  {player.name}
                </span>
                <span className="text-[10px] text-parchment-400 leading-tight mt-0.5">
                  Lv.{player.level}
                </span>
              </div>
              <ChevronDown
                size={14}
                className={cn(
                  'text-parchment-400 transition-transform duration-200',
                  menuOpen && 'rotate-180'
                )}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 rounded-xl bg-gradient-to-br from-parchment-900 to-parchment-950 border border-bronze-700/40 shadow-relic-card backdrop-blur-sm overflow-hidden z-50">
                <div className="p-4 border-b border-bronze-700/30 bg-gradient-to-r from-bronze-600/10 to-transparent">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-bronze-emboss flex items-center justify-center text-2xl border border-bronze-400/30 shadow-bronze-emboss">
                      {player.avatar}
                    </div>
                    <div>
                      <div className="font-display font-bold text-parchment-100">
                        {player.name}
                      </div>
                      <div className="text-xs text-parchment-400 font-body">
                        Lv.{player.level} 考古学家
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-parchment-200 hover:bg-parchment-800/50 hover:text-parchment-50 transition-all duration-200 text-sm font-body">
                    <User size={16} className="text-bronze-400" />
                    个人档案
                  </button>
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-parchment-200 hover:bg-parchment-800/50 hover:text-parchment-50 transition-all duration-200 text-sm font-body">
                    <Settings size={16} className="text-bronze-400" />
                    游戏设置
                  </button>
                  <div className="my-2 h-px bg-gradient-to-r from-transparent via-bronze-700/30 to-transparent" />
                  <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-terracotta-300 hover:bg-terracotta-900/30 hover:text-terracotta-200 transition-all duration-200 text-sm font-body">
                    <LogOut size={16} />
                    退出游戏
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
