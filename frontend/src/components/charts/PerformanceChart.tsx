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
  ReferenceLine,
  Cell,
} from 'recharts';
import { Loader2, TrendingDown, TrendingUp } from 'lucide-react';

interface DataPoint {
  date: string;
  growth: number;
  drawdown: number;
}

interface PerformanceChartProps {
  data?: DataPoint[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  granularity?: 'hourly' | 'daily' | 'weekly' | 'monthly';
  onGranularityChange?: (granularity: 'hourly' | 'daily' | 'weekly' | 'monthly') => void;
  title?: string;
  summary?: string;
  growthLabel?: string;
  drawdownLabel?: string;
}

const granularities = [
  { label: 'Hourly', value: 'hourly' },
  { label: 'Daily', value: 'daily' },
  { label: 'Weekly', value: 'weekly' },
  { label: 'Monthly', value: 'monthly' },
] as const;

const barColors = {
  growth: '#22c55e',
  loss: '#ef4444',
  drawdown: '#ef4444',
};

function normalizePercent(value: number) {
  return Math.abs(value) < 0.05 ? 0 : value;
}

function formatPercent(value: number, fractionDigits = 1) {
  return `${normalizePercent(value).toFixed(fractionDigits)}%`;
}

function formatSignedPercent(value: number, fractionDigits = 0) {
  const normalizedValue = normalizePercent(value);
  const sign = normalizedValue > 0 ? '+' : '';

  return `${sign}${normalizedValue.toFixed(fractionDigits)}%`;
}

function getReturnColor(value: number) {
  return normalizePercent(value) >= 0 ? barColors.growth : barColors.loss;
}

function getReturnTextClass(value: number) {
  return normalizePercent(value) >= 0 ? 'text-accent-green' : 'text-accent-red';
}

function getChartMinWidth(dataLength: number, granularity: PerformanceChartProps['granularity']) {
  const widthByGranularity = {
    hourly: 44,
    daily: 34,
    weekly: 34,
    monthly: 34,
  };

  return Math.max(620, dataLength * widthByGranularity[granularity || 'daily']);
}

function getYAxisDomain(values: number[]) {
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);

  if (Math.abs(min) < 0.05 && Math.abs(max) < 0.05) {
    return [-1, 1];
  }

  const largestMagnitude = Math.max(Math.abs(min), Math.abs(max), 1);
  const padding = largestMagnitude * 0.12;

  if (min < 0 && max > 0) {
    const bound = Math.ceil((largestMagnitude + padding) * 10) / 10;

    return [-bound, bound];
  }

  if (max <= 0) {
    return [Math.floor((min - padding) * 10) / 10, 0];
  }

  return [0, Math.ceil((max + padding) * 10) / 10];
}

const CustomTooltip = ({
  active,
  payload,
  label,
  growthLabel = 'Growth',
  drawdownLabel = 'Drawdown',
}: any) => {
  if (active && payload && payload.length) {
    const growth = payload.find((item: any) => item.dataKey === 'growth');
    const drawdown = payload.find((item: any) => item.dataKey === 'drawdown');

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass max-w-[calc(100vw-2rem)] rounded-xl border border-border/70 p-3 shadow-xl sm:p-4"
      >
        <p className="mb-3 text-sm font-medium text-foreground">{label}</p>
        <div className="space-y-2">
          <div className="flex min-w-44 items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-sm text-foreground-muted">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: getReturnColor(Number(growth?.value || 0)) }}
              />
              {growthLabel}
            </span>
            <span className={`font-mono text-sm font-semibold ${getReturnTextClass(Number(growth?.value || 0))}`}>
              {formatPercent(Number(growth?.value || 0))}
            </span>
          </div>
          <div className="flex min-w-44 items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-sm text-foreground-muted">
              <span className="h-2.5 w-2.5 rounded-full bg-accent-red" />
              {drawdownLabel}
            </span>
            <span className="font-mono text-sm font-semibold text-accent-red">
              {formatPercent(Number(drawdown?.value || 0))}
            </span>
          </div>
        </div>
      </motion.div>
    );
  }
  return null;
};

export function PerformanceChart({
  data,
  isLoading,
  isRefreshing,
  granularity = 'daily',
  onGranularityChange,
  title = 'Signal Performance',
  summary,
  growthLabel = 'Growth',
  drawdownLabel = 'Drawdown',
}: PerformanceChartProps) {
  const chartData = data || [];
  const hasChartData = chartData.length > 0;

  // Calculate totals
  const totalGrowth = hasChartData ? chartData[chartData.length - 1]?.growth || 0 : 0;
  const maxDrawdown = hasChartData ? Math.min(...chartData.map(d => d.drawdown)) : 0;
  const chartMinWidth = getChartMinWidth(chartData.length, granularity);
  const yAxisDomain = hasChartData
    ? getYAxisDomain(chartData.flatMap((point) => [point.growth, point.drawdown]))
    : [-1, 1];
  const emptyStateMessage =
    growthLabel === 'Trade return'
      ? 'Trading bars will appear after executed OPEN/CLOSE activity is available.'
      : 'Balance growth and equity drawdown will appear after connected MT5 accounts send heartbeat balance and equity snapshots.';

  if (isLoading) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-xl bg-background-secondary/30 sm:h-[350px]">
        <div className="flex flex-col items-center gap-3 text-foreground-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm">Loading trading performance</span>
        </div>
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
      <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex-shrink-0 rounded-xl bg-primary/10 p-2.5">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-display text-lg font-semibold">{title}</h3>
            <p className="text-sm leading-relaxed text-foreground-muted">
              {summary || `${totalGrowth >= 0 ? '+' : ''}${formatPercent(totalGrowth, 2)} growth • ${formatPercent(maxDrawdown, 2)} max drawdown`}
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            {granularities.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  if (isRefreshing || granularity === option.value) return;
                  onGranularityChange?.(option.value);
                }}
                aria-pressed={granularity === option.value}
                className={`rounded-lg px-3 py-2 text-xs font-medium outline-none transition-[background,color,box-shadow,transform] duration-150 focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-w-20 ${
                  granularity === option.value
                    ? 'bg-primary text-white shadow-sm'
                    : isRefreshing
                      ? 'cursor-wait bg-background-elevated text-foreground-muted/70'
                      : 'bg-background-elevated text-foreground-muted hover:bg-background-tertiary hover:text-foreground active:scale-[0.97]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      {hasChartData ? (
        <div className="relative">
          {isRefreshing && (
            <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-2 rounded-lg border border-border/70 bg-background-secondary/90 px-2.5 py-1.5 text-xs text-foreground-muted shadow-sm backdrop-blur">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
              Updating
            </div>
          )}

          <div className="overflow-x-auto overflow-y-hidden pb-2 [scrollbar-color:var(--border)_transparent]">
            <div className="h-[260px] sm:h-[300px]" style={{ minWidth: chartMinWidth }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  barCategoryGap={chartData.length > 20 ? 10 : 18}
                  barGap={6}
                  margin={{ top: 12, right: 8, left: 0, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    opacity={0.45}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--foreground-subtle)', fontSize: 12 }}
                    dy={10}
                    interval="preserveStartEnd"
                    minTickGap={26}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--foreground-subtle)', fontSize: 11 }}
                    width={48}
                    domain={yAxisDomain}
                    tickCount={5}
                    tickFormatter={(value) => formatSignedPercent(Number(value), 0)}
                  />
                  <ReferenceLine
                    y={0}
                    stroke="var(--foreground-subtle)"
                    strokeOpacity={0.55}
                    strokeWidth={1}
                  />
                  <Tooltip
                    cursor={false}
                    content={
                      <CustomTooltip
                        growthLabel={growthLabel}
                        drawdownLabel={drawdownLabel}
                      />
                    }
                  />
                  <Bar
                    dataKey="growth"
                    maxBarSize={34}
                    radius={[5, 5, 0, 0]}
                    animationDuration={700}
                  >
                    {chartData.map((point) => (
                      <Cell key={`growth-${point.date}`} fill={getReturnColor(point.growth)} />
                    ))}
                  </Bar>
                  <Bar
                    dataKey="drawdown"
                    fill={barColors.drawdown}
                    maxBarSize={34}
                    radius={[0, 0, 5, 5]}
                    animationDuration={700}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex h-[240px] items-center justify-center rounded-xl border border-dashed border-border bg-background-secondary/40 px-4 text-center sm:h-[280px]">
          <div>
            <p className="font-medium">No trading performance data yet</p>
            <p className="mt-1 max-w-md text-sm text-foreground-muted">
              {emptyStateMessage}
            </p>
          </div>
        </div>
      )}

      {/* Legend */}
      {hasChartData && (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-accent-green" />
              <span className="text-sm text-foreground-muted">{growthLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-accent-red" />
              <span className="text-sm text-foreground-muted">{drawdownLabel}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <div className="rounded-lg bg-background-elevated px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <TrendingUp className="h-3.5 w-3.5 text-accent-green" />
                Latest
              </div>
              <p className={`mt-0.5 font-mono text-sm font-semibold ${getReturnTextClass(totalGrowth)}`}>
                {totalGrowth >= 0 ? '+' : ''}{formatPercent(totalGrowth, 2)}
              </p>
            </div>
            <div className="rounded-lg bg-background-elevated px-3 py-2">
              <div className="flex items-center gap-1.5 text-xs text-foreground-muted">
                <TrendingDown className="h-3.5 w-3.5 text-accent-red" />
                Max drawdown
              </div>
              <p className="mt-0.5 font-mono text-sm font-semibold text-accent-red">
                {formatPercent(maxDrawdown, 2)}
              </p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
