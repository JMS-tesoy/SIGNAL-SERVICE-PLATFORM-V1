import type { PerformanceGranularity } from './types';

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

export function formatMetricValue(value: string | number) {
  if (typeof value === 'number') {
    return compactNumberFormatter.format(value);
  }

  return value;
}

export function formatTradePrice(value: number | null | undefined) {
  return typeof value === 'number' ? value.toFixed(5) : '-';
}

export function formatMoneyValue(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';

  return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
}

export function formatCompactDateTime(value: string | null | undefined) {
  if (!value) return 'No report time';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No report time';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function getValueTone(value: number | null | undefined) {
  if (typeof value !== 'number') return 'text-foreground-muted';

  return value >= 0 ? 'text-accent-green' : 'text-accent-red';
}

export function getPerformanceRequestGranularity(
  granularity: PerformanceGranularity,
) {
  return granularity === 'hourly' || granularity === 'daily'
    ? 'hourly'
    : 'daily';
}
