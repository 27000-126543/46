import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer
} from 'recharts';
import type { Relic, Rarity } from '@/types';
import { rarityColors } from '@/data/config';

interface RelicStatsProps {
  relic: Relic;
  size?: 'sm' | 'md' | 'lg';
}

const sizeConfig = {
  sm: { width: 160, height: 160, fontSize: 10, strokeWidth: 1.5 },
  md: { width: 220, height: 220, fontSize: 12, strokeWidth: 2 },
  lg: { width: 300, height: 300, fontSize: 14, strokeWidth: 2.5 }
};

const rarityStrokeColor: Record<Rarity, string> = {
  common: '#9CA3AF',
  rare: '#4A7C59',
  epic: '#A855F7',
  legendary: '#D4AF37'
};

export default function RelicStats({ relic, size = 'md' }: RelicStatsProps) {
  const config = sizeConfig[size];

  const data = [
    {
      subject: '完整度',
      value: relic.completeness,
      fullMark: 100
    },
    {
      subject: '稀有度',
      value: relic.rarity === 'common' ? 25 : relic.rarity === 'rare' ? 50 : relic.rarity === 'epic' ? 75 : 100,
      fullMark: 100
    },
    {
      subject: '历史价值',
      value: Math.min((relic.historicalValue / 1000) * 100, 100),
      fullMark: 100
    }
  ];

  const strokeColor = rarityStrokeColor[relic.rarity];
  const fillColor = `${strokeColor}40`;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: config.width, height: config.height }}
    >
      <div
        className="absolute inset-0 rounded-full opacity-20"
        style={{
          background: `radial-gradient(circle, ${strokeColor}20 0%, transparent 70%)`
        }}
      />
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart
          cx="50%"
          cy="50%"
          outerRadius="70%"
          data={data}
        >
          <PolarGrid
            stroke={strokeColor}
            strokeOpacity={0.3}
            strokeDasharray="3 3"
          />
          <PolarAngleAxis
            dataKey="subject"
            tick={{
              fill: '#E8D5B0',
              fontSize: config.fontSize,
              fontFamily: '"Cormorant Garamond", serif',
              fontWeight: 600
            }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name={relic.name}
            dataKey="value"
            stroke={strokeColor}
            fill={fillColor}
            fillOpacity={0.5}
            strokeWidth={config.strokeWidth}
            dot={{
              fill: strokeColor,
              stroke: '#2C1810',
              strokeWidth: 1.5,
              r: config.fontSize / 2
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
      <div
        className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-display font-semibold tracking-wider uppercase"
        style={{
          color: strokeColor,
          backgroundColor: 'rgba(44, 24, 16, 0.8)',
          border: `1px solid ${strokeColor}50`,
          textShadow: `0 0 6px ${strokeColor}60`
        }}
      >
        {rarityColors[relic.rarity].label}
      </div>
    </div>
  );
}
