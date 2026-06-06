import React from 'react';
import { motion } from 'framer-motion';
import { Star, User, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { TeamMember } from '../../types';
import { professionNames } from '../../data/config';
import RarityBadge from './RarityBadge';

interface MemberCardProps {
  member: TeamMember;
  onClick?: () => void;
  selected?: boolean;
  inTeam?: boolean;
  showSkills?: boolean;
}

const professionColorMap: Record<string, string> = {
  explorer: 'from-amber-500 to-amber-700',
  linguist: 'from-blue-500 to-blue-700',
  engineer: 'from-ruin-500 to-ruin-700',
  archaeologist: 'from-terracotta-500 to-terracotta-700',
  historian: 'from-purple-500 to-purple-700',
};

export const MemberCard: React.FC<MemberCardProps> = ({
  member,
  onClick,
  selected = false,
  inTeam = false,
  showSkills = true,
}) => {
  const luckStars = Math.min(5, Math.max(0, Math.round(member.luck / 20)));

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.03, y: -2 } : undefined}
      whileTap={onClick ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'card-parchment p-4 cursor-pointer transition-all duration-300 border-2',
        `relic-rarity-${member.rarity}`,
        selected && 'ring-2 ring-bronze-400 ring-offset-2 ring-offset-parchment-950',
      )}
    >
      <div className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div
            className={cn(
              'w-16 h-16 rounded-full p-0.5 bg-gradient-to-br',
              professionColorMap[member.profession],
            )}
          >
            <div className="w-full h-full rounded-full bg-parchment-900 flex items-center justify-center overflow-hidden">
              {member.avatar ? (
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <User className="w-8 h-8 text-parchment-400" />
              )}
            </div>
          </div>
          {inTeam && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-ruin-500 border-2 border-parchment-950 flex items-center justify-center">
              <Check className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-display font-semibold text-parchment-50 text-lg">
                {member.name}
              </h4>
              <p className="text-sm text-parchment-300 mt-0.5">
                {professionNames[member.profession]} · Lv.{member.skillLevel}
              </p>
            </div>
            <RarityBadge rarity={member.rarity} size="sm" />
          </div>

          <div className="flex items-center gap-1 mt-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'w-4 h-4',
                  i < luckStars
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-parchment-700',
                )}
              />
            ))}
            <span className="text-xs text-parchment-400 ml-1">
              幸运 {member.luck}
            </span>
          </div>

          {showSkills && (
            <div className="mt-3 grid grid-cols-2 gap-1.5 text-xs">
              <div className="flex justify-between text-parchment-300">
                <span>探索速度</span>
                <span className="text-parchment-100 font-mono">
                  {member.skills.explorationSpeed}
                </span>
              </div>
              <div className="flex justify-between text-parchment-300">
                <span>文物发现</span>
                <span className="text-parchment-100 font-mono">
                  {member.skills.relicDiscovery}
                </span>
              </div>
              <div className="flex justify-between text-parchment-300">
                <span>陷阱处理</span>
                <span className="text-parchment-100 font-mono">
                  {member.skills.trapHandling}
                </span>
              </div>
              <div className="flex justify-between text-parchment-300">
                <span>修复加成</span>
                <span className="text-parchment-100 font-mono">
                  {member.skills.repairBonus}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MemberCard;
