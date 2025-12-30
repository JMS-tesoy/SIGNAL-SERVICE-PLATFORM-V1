'use client';

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

interface SymbolBarChartProps {
  data?: Record<string, number>;
  isLoading?: boolean;
}

// Empty data when no real data exists
const emptyData: Record<string, number> = {};

const GRADIENT_COLORS = [
  { start: '#0ea5e9', end: '#06b6d4' },
  { start: '#8b5cf6', end: '#a855f7' },
  { start: '#22c55e', end: '#10b981' },
  { start: '#f59e0b', end: '#eab308' },
  { start: '#ef4444', end: '#f97316' },
  { start: '#ec4899', end: '#f472b6' },
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-xl px-4 py-3 shadow-xl"
      >
        <p className="font-semibold text-foreground">{payload[0].payload.symbol}</p>
        <p className="text-sm text-foreground-muted">
          <span className="text-primary font-semibold">{payload[0].value}</span> signals
        </p>
      </motion.div>
    );
  }
  return null;
};

export function SymbolBarChart({ data = emptyData, isLoading }: SymbolBarChartProps) {
  // Transform data object to array and sort by value
  const chartData = Object.entries(data)
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const hasData = chartData.length > 0;
  const maxValue = hasData ? Math.max(...chartData.map(d => d.count)) : 10;

  if (isLoading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-accent-purple/10">
          <BarChart3 className="w-5 h-5 text-accent-purple" />
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Signals by Symbol</h3>
          <p className="text-sm text-foreground-muted">Top {hasData ? chartData.length : 0} trading pairs</p>
        </div>
      </div>

      {/* Empty state */}
      {!hasData && (
        <div className="h-[240px] flex items-center justify-center text-foreground-muted">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No signal data yet</p>
          </div>
        </div>
      )}

      {/* Chart */}
      {hasData && (
      <div className="h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 20, left: 10, bottom: 0 }}
          >
            <defs>
              {GRADIENT_COLORS.map((color, index) => (
                <linearGradient
                  key={`gradient-${index}`}
                  id={`barGradient${index}`}
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="0"
                >
                  <stop offset="0%" stopColor={color.start} />
                  <stop offset="100%" stopColor={color.end} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.5}
              horizontal={false}
            />
            <XAxis
              type="number"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--foreground-subtle)', fontSize: 12 }}
              domain={[0, maxValue * 1.1]}
            />
            <YAxis
              type="category"
              dataKey="symbol"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--foreground-muted)', fontSize: 13, fontWeight: 500 }}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--background-elevated)', opacity: 0.5 }} />
            <Bar
              dataKey="count"
              radius={[0, 6, 6, 0]}
              animationDuration={1000}
              animationBegin={200}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`url(#barGradient${index % GRADIENT_COLORS.length})`}
                  style={{
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  }}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      )}
    </motion.div>
  );
}
