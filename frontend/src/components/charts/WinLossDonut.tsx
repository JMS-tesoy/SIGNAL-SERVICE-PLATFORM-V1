'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts';
import { Target } from 'lucide-react';

interface WinLossDonutProps {
  wins?: number;
  losses?: number;
  pending?: number;
  pendingLabel?: string;
  isLoading?: boolean;
}

const COLORS = {
  wins: '#22c55e',
  losses: '#ef4444',
  pending: '#f59e0b',
};

const countFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const renderActiveShape = (props: any) => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
    percent,
  } = props;

  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        style={{
          filter: `drop-shadow(0 0 8px ${fill}50)`,
          transition: 'all 0.3s ease',
        }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 12}
        outerRadius={outerRadius + 14}
        fill={fill}
      />
    </g>
  );
};

export function WinLossDonut({
  wins = 0,
  losses = 0,
  pending = 0,
  pendingLabel = 'Pending',
  isLoading
}: WinLossDonutProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const total = wins + losses + pending;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : '0';

  const data = [
    { name: 'Executed', value: wins, color: COLORS.wins },
    { name: 'Failed', value: losses, color: COLORS.losses },
    { name: pendingLabel, value: pending, color: COLORS.pending },
  ].filter(d => d.value > 0);

  if (isLoading) {
    return (
      <div className="flex h-[280px] items-center justify-center sm:h-[300px]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      {/* Header */}
      <div className="mb-4 flex min-w-0 items-start gap-3">
        <div className="flex-shrink-0 rounded-xl bg-accent-green/10 p-2.5">
          <Target className="h-5 w-5 text-accent-green" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold">Execution Rate</h3>
          <p className="text-sm text-foreground-muted">{countFormatter.format(total)} total signals</p>
        </div>
      </div>

      {/* Chart */}
      <div className="relative h-[200px] sm:h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              activeIndex={activeIndex !== null ? activeIndex : undefined}
              activeShape={renderActiveShape}
              data={data}
              cx="50%"
              cy="50%"
              innerRadius="48%"
              outerRadius="64%"
              paddingAngle={3}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
              animationBegin={0}
              animationDuration={800}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center content */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="text-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
          >
            <p className="font-display text-2xl font-bold text-accent-green sm:text-3xl">{winRate}%</p>
            <p className="text-sm text-foreground-muted">Success</p>
          </motion.div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
        {data.map((entry, index) => (
          <motion.div
            key={entry.name}
            className={`flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all cursor-pointer sm:px-3 ${
              activeIndex === index ? 'bg-background-elevated' : ''
            }`}
            onMouseEnter={() => setActiveIndex(index)}
            onMouseLeave={() => setActiveIndex(null)}
            whileHover={{ scale: 1.05 }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs sm:text-sm">
              <span className="text-foreground-muted">{entry.name}:</span>{' '}
              <span className="font-semibold">{countFormatter.format(entry.value)}</span>
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
