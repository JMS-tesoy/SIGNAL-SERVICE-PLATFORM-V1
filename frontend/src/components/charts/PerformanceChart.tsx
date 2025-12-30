'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

interface DataPoint {
  date: string;
  growth: number;
  drawdown: number;
}

interface PerformanceChartProps {
  data?: DataPoint[];
  isLoading?: boolean;
  period?: '7D' | '30D' | '90D';
  onPeriodChange?: (period: '7D' | '30D' | '90D') => void;
}

// Generate empty data for display when no real data exists
const generateEmptyData = (days: number): DataPoint[] => {
  const data: DataPoint[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    data.push({
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      growth: 0,
      drawdown: 0,
    });
  }

  return data;
};

const periods = [
  { label: '7D', value: 7 },
  { label: '30D', value: 30 },
  { label: '90D', value: 90 },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-xl p-4 shadow-xl"
      >
        <p className="text-foreground-muted text-sm mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-green" />
            <span className="text-sm">Growth: <span className="font-semibold text-accent-green">{payload[0]?.value?.toFixed(2)}%</span></span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-accent-red" />
            <span className="text-sm">Drawdown: <span className="font-semibold text-accent-red">{payload[1]?.value?.toFixed(2)}%</span></span>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

export function PerformanceChart({ data, isLoading, period = '90D', onPeriodChange }: PerformanceChartProps) {
  // Convert period string to days for empty data generation
  const periodDays = period === '7D' ? 7 : period === '30D' ? 30 : 90;

  const chartData = data && data.length > 0 ? data : generateEmptyData(periodDays);

  // Calculate totals
  const totalGrowth = chartData.length > 0 ? chartData[chartData.length - 1]?.growth || 0 : 0;
  const maxDrawdown = Math.min(...chartData.map(d => d.drawdown));

  if (isLoading) {
    return (
      <div className="h-[350px] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary/10">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display text-lg font-semibold">Signal Performance</h3>
            <p className="text-sm text-foreground-muted">
              {totalGrowth >= 0 ? '+' : ''}{totalGrowth.toFixed(2)}% growth • {maxDrawdown.toFixed(2)}% max drawdown
            </p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-1 p-1 bg-background-elevated rounded-lg">
          {periods.map((p) => (
            <button
              key={p.value}
              onClick={() => onPeriodChange?.(p.label as '7D' | '30D' | '90D')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                period === p.label
                  ? 'bg-primary text-white'
                  : 'text-foreground-muted hover:text-foreground hover:bg-background-tertiary'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border)"
              opacity={0.5}
              vertical={false}
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--foreground-subtle)', fontSize: 12 }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--foreground-subtle)', fontSize: 12 }}
              dx={-10}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="growth"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#growthGradient)"
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="drawdown"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#drawdownGradient)"
              animationDuration={1200}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-green" />
          <span className="text-sm text-foreground-muted">Growth</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-accent-red" />
          <span className="text-sm text-foreground-muted">Drawdown</span>
        </div>
      </div>
    </motion.div>
  );
}
