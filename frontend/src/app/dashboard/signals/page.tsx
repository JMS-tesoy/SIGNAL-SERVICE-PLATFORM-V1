'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  ListFilter,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import {
  signalApi,
  type SignalHistoryResponse,
  type SignalStatsResponse,
} from '@/lib/api';
import { SignalDetailsModal } from './components/SignalDetailsModal';

type StatusFilter = 'ALL' | 'EXECUTED' | 'PENDING' | 'FAILED' | 'SKIPPED' | 'EXPIRED' | 'CANCELED';
type ActionFilter = 'ALL' | 'OPEN' | 'CLOSE' | 'MODIFY';
type TypeFilter = 'ALL' | 'BUY' | 'SELL';
type DateRangeFilter = '7D' | '30D' | '90D' | 'ALL';

const STATUS_OPTIONS: StatusFilter[] = [
  'ALL',
  'EXECUTED',
  'PENDING',
  'FAILED',
  'SKIPPED',
  'EXPIRED',
  'CANCELED',
];
const ACTION_OPTIONS: ActionFilter[] = ['ALL', 'OPEN', 'CLOSE', 'MODIFY'];
const TYPE_OPTIONS: TypeFilter[] = ['ALL', 'BUY', 'SELL'];
const DATE_RANGE_OPTIONS: DateRangeFilter[] = ['7D', '30D', '90D', 'ALL'];
const NEED_ATTENTION_STATUSES = new Set(['FAILED', 'SKIPPED', 'EXPIRED', 'CANCELED']);
const LIMIT = 20;

function getDateRange(range: DateRangeFilter) {
  if (range === 'ALL') {
    return {};
  }

  const days = range === '7D' ? 7 : range === '30D' ? 30 : 90;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  return {
    startDate: startDate.toISOString(),
    endDate: new Date().toISOString(),
  };
}

function formatDate(value: string | null) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 5,
  });
}

function formatVolume(value: number) {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

function getDisplayStatus(signal: SignalHistoryResponse) {
  return signal.execution?.status || signal.status;
}

function getStatusBadgeClass(status: string) {
  if (status === 'EXECUTED') {
    return 'bg-accent-green/10 text-accent-green border-accent-green/20';
  }

  if (status === 'FAILED' || status === 'CANCELED') {
    return 'bg-accent-red/10 text-accent-red border-accent-red/20';
  }

  if (status === 'EXPIRED' || status === 'SKIPPED') {
    return 'bg-accent-yellow/10 text-accent-yellow border-accent-yellow/20';
  }

  return 'bg-primary/10 text-primary border-primary/20';
}

function getActionBadgeClass(action: string) {
  if (action === 'OPEN') {
    return 'bg-primary/10 text-primary';
  }

  if (action === 'CLOSE') {
    return 'bg-accent-purple/10 text-accent-purple';
  }

  return 'bg-accent-yellow/10 text-accent-yellow';
}

function SummarySkeleton() {
  return (
    <div className="card p-4 sm:p-5">
      <div className="h-4 w-24 animate-pulse rounded bg-background-elevated" />
      <div className="mt-4 h-8 w-16 animate-pulse rounded bg-background-elevated" />
    </div>
  );
}

function RowSkeleton() {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: 10 }).map((_, index) => (
        <td key={index} className="px-4 py-4">
          <div className="h-4 animate-pulse rounded bg-background-elevated" />
        </td>
      ))}
    </tr>
  );
}

function CardSkeleton() {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="h-5 w-24 animate-pulse rounded bg-background-elevated" />
          <div className="h-4 w-36 animate-pulse rounded bg-background-elevated" />
        </div>
        <div className="h-6 w-20 animate-pulse rounded-full bg-background-elevated" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-10 animate-pulse rounded bg-background-elevated" />
        ))}
      </div>
    </div>
  );
}

export default function SignalsPage() {
  const { accessToken } = useAuthStore();
  const [signals, setSignals] = useState<SignalHistoryResponse[]>([]);
  const [stats, setStats] = useState<SignalStatsResponse | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [actionFilter, setActionFilter] = useState<ActionFilter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30D');
  const [selectedSignal, setSelectedSignal] = useState<SignalHistoryResponse | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));
  const hasActiveFilters =
    searchInput.trim() !== '' ||
    symbolFilter.trim() !== '' ||
    statusFilter !== 'ALL' ||
    actionFilter !== 'ALL' ||
    typeFilter !== 'ALL' ||
    dateRange !== '30D';

  const summaryCards = useMemo(() => {
    const needAttention = stats
      ? stats.failed + stats.skipped + stats.expired + stats.canceled
      : 0;

    return [
      {
        label: 'Total signals',
        value: stats ? stats.totalSignals.toLocaleString() : '-',
        icon: ListFilter,
        iconClass: 'bg-primary/10 text-primary',
      },
      {
        label: 'Executed',
        value: stats ? stats.executed.toLocaleString() : '-',
        icon: TrendingUp,
        iconClass: 'bg-accent-green/10 text-accent-green',
      },
      {
        label: 'Need attention',
        value: stats ? needAttention.toLocaleString() : '-',
        icon: AlertCircle,
        iconClass: 'bg-accent-red/10 text-accent-red',
      },
      {
        label: 'Pending',
        value: stats ? stats.pending.toLocaleString() : '-',
        icon: Clock,
        iconClass: 'bg-accent-yellow/10 text-accent-yellow',
      },
    ];
  }, [stats]);

  const fetchStats = useCallback(async () => {
    if (!accessToken) {
      setIsStatsLoading(false);
      return;
    }

    setIsStatsLoading(true);
    setStatsError(null);

    try {
      const result = await signalApi.getStats(accessToken, 'all');

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        setStats(result.data);
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Failed to fetch signal stats.';
      console.error('Failed to fetch signal stats:', fetchError);
      setStats(null);
      setStatsError(message);
    } finally {
      setIsStatsLoading(false);
    }
  }, [accessToken]);

  const fetchSignals = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHistoryError(null);

    try {
      const range = getDateRange(dateRange);
      const result = await signalApi.getHistory(accessToken, {
        limit: LIMIT,
        offset: (page - 1) * LIMIT,
        symbol: symbolFilter.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        type: typeFilter !== 'ALL' ? typeFilter : undefined,
        ...range,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (result.data) {
        setSignals(result.data.signals);
        setTotal(result.data.total);
      }
    } catch (fetchError) {
      const message =
        fetchError instanceof Error ? fetchError.message : 'Failed to fetch signals.';
      setHistoryError(message);
      setSignals([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, actionFilter, dateRange, page, statusFilter, symbolFilter, typeFilter]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSymbolFilter(searchInput.trim());
    setPage(1);
  };

  const handleRefresh = () => {
    fetchStats();
    fetchSignals();
  };

  const clearFilters = () => {
    setSearchInput('');
    setSymbolFilter('');
    setStatusFilter('ALL');
    setActionFilter('ALL');
    setTypeFilter('ALL');
    setDateRange('30D');
    setPage(1);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="mb-1 text-xl font-bold sm:mb-2 sm:text-2xl">Signals</h1>
          <p className="text-sm text-foreground-muted sm:text-base">
            Monitor signal activity, execution outcomes, and items that need attention.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading || isStatsLoading}
          className="btn-secondary flex items-center justify-center gap-2 px-3 py-2 text-sm sm:px-4"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading || isStatsLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {isStatsLoading
          ? Array.from({ length: 4 }).map((_, index) => <SummarySkeleton key={index} />)
          : summaryCards.map((card) => {
              const Icon = card.icon;

              return (
                <div key={card.label} className="card p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-foreground-muted">{card.label}</p>
                      <p className="mt-2 text-2xl font-bold">{card.value}</p>
                    </div>
                    <div className={`rounded-lg p-2.5 ${card.iconClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
      </div>

      <div className="card p-3 sm:p-5">
        <form onSubmit={handleSearch} className="grid gap-3 xl:grid-cols-[minmax(220px,1.2fr)_repeat(4,minmax(120px,0.7fr))_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search symbol"
              className="input h-11 pl-10 text-sm"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as StatusFilter);
              setPage(1);
            }}
            className="input h-11 text-sm"
            aria-label="Status filter"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status === 'ALL' ? 'All statuses' : status}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(event) => {
              setActionFilter(event.target.value as ActionFilter);
              setPage(1);
            }}
            className="input h-11 text-sm"
            aria-label="Action filter"
          >
            {ACTION_OPTIONS.map((action) => (
              <option key={action} value={action}>
                {action === 'ALL' ? 'All actions' : action}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(event) => {
              setTypeFilter(event.target.value as TypeFilter);
              setPage(1);
            }}
            className="input h-11 text-sm"
            aria-label="Type filter"
          >
            {TYPE_OPTIONS.map((type) => (
              <option key={type} value={type}>
                {type === 'ALL' ? 'Buy and sell' : type}
              </option>
            ))}
          </select>

          <select
            value={dateRange}
            onChange={(event) => {
              setDateRange(event.target.value as DateRangeFilter);
              setPage(1);
            }}
            className="input h-11 text-sm"
            aria-label="Date range"
          >
            {DATE_RANGE_OPTIONS.map((range) => (
              <option key={range} value={range}>
                {range === 'ALL' ? 'All time' : range}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            <button type="submit" className="btn-primary h-11 flex-1 px-4 text-sm xl:flex-none">
              Search
            </button>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
              className="btn-secondary h-11 flex-1 px-4 text-sm disabled:cursor-not-allowed disabled:opacity-50 xl:flex-none"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {(historyError || statsError) && (
        <div className="card border-accent-red/20 bg-accent-red/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 text-accent-red" />
              <div>
                <p className="font-medium text-accent-red">
                  Unable to load signal activity
                </p>
                <div className="space-y-1 text-sm text-foreground-muted">
                  {historyError && <p>History: {historyError}</p>}
                  {statsError && <p>Summary: {statsError}</p>}
                </div>
              </div>
            </div>
            <button onClick={handleRefresh} className="btn-secondary px-4 py-2 text-sm">
              Retry
            </button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">Time</th>
                <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">Symbol</th>
                <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">Side</th>
                <th className="px-4 py-4 text-left text-xs font-medium uppercase tracking-wide text-foreground-muted">Action</th>
                <th className="px-4 py-4 text-right text-xs font-medium uppercase tracking-wide text-foreground-muted">Vol</th>
                <th className="px-4 py-4 text-right text-xs font-medium uppercase tracking-wide text-foreground-muted">Price</th>
                <th className="px-4 py-4 text-right text-xs font-medium uppercase tracking-wide text-foreground-muted">SL / TP</th>
                <th className="px-4 py-4 text-right text-xs font-medium uppercase tracking-wide text-foreground-muted">Executed</th>
                <th className="px-4 py-4 text-center text-xs font-medium uppercase tracking-wide text-foreground-muted">Status</th>
                <th className="px-4 py-4 text-right text-xs font-medium uppercase tracking-wide text-foreground-muted">Details</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, index) => <RowSkeleton key={index} />)
              ) : signals.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center">
                    <p className="font-medium">
                      {hasActiveFilters ? 'No signals match these filters' : 'No signal activity yet'}
                    </p>
                    <p className="mt-1 text-sm text-foreground-muted">
                      {hasActiveFilters
                        ? 'Clear or adjust the filters to widen the activity view.'
                        : 'Signals will appear here after sender and receiver activity is recorded.'}
                    </p>
                  </td>
                </tr>
              ) : (
                signals.map((signal, index) => {
                  const status = getDisplayStatus(signal);
                  return (
                    <motion.tr
                      key={signal.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(index * 0.03, 0.2) }}
                      className="border-b border-border hover:bg-background-elevated/50"
                    >
                      <td className="px-4 py-4 font-mono text-sm text-foreground-muted">
                        {formatDate(signal.createdAt)}
                      </td>
                      <td className="px-4 py-4 font-semibold">{signal.symbol}</td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                            signal.type === 'BUY'
                              ? 'bg-accent-green/10 text-accent-green'
                              : 'bg-accent-red/10 text-accent-red'
                          }`}
                        >
                          {signal.type === 'BUY' ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : (
                            <TrendingDown className="h-3.5 w-3.5" />
                          )}
                          {signal.type}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded px-2 py-1 text-xs font-medium ${getActionBadgeClass(signal.action)}`}>
                          {signal.action}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm">
                        {formatVolume(signal.volume)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm">
                        {formatPrice(signal.price)}
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-foreground-muted">
                        <div>SL {formatPrice(signal.sl)}</div>
                        <div>TP {formatPrice(signal.tp)}</div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-sm">
                        {formatPrice(signal.execution?.executedPrice)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setSelectedSignal(signal)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm text-foreground-muted hover:bg-background-elevated hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => <CardSkeleton key={index} />)
          ) : signals.length === 0 ? (
            <div className="px-2 py-12 text-center">
              <p className="font-medium">
                {hasActiveFilters ? 'No signals match these filters' : 'No signal activity yet'}
              </p>
              <p className="mt-1 text-sm text-foreground-muted">
                {hasActiveFilters
                  ? 'Clear or adjust the filters to widen the activity view.'
                  : 'Signals will appear here after activity is recorded.'}
              </p>
            </div>
          ) : (
            signals.map((signal, index) => {
              const status = getDisplayStatus(signal);

              return (
                <motion.button
                  key={signal.id}
                  type="button"
                  onClick={() => setSelectedSignal(signal)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.2) }}
                  className="card w-full p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{signal.symbol}</p>
                        <span
                          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                            signal.type === 'BUY'
                              ? 'bg-accent-green/10 text-accent-green'
                              : 'bg-accent-red/10 text-accent-red'
                          }`}
                        >
                          {signal.type}
                        </span>
                        <span className={`rounded px-2 py-1 text-xs font-medium ${getActionBadgeClass(signal.action)}`}>
                          {signal.action}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-foreground-muted">{formatDate(signal.createdAt)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(status)}`}>
                      {status}
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-foreground-muted">Price</p>
                      <p className="font-mono">{formatPrice(signal.price)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-foreground-muted">Executed</p>
                      <p className="font-mono">{formatPrice(signal.execution?.executedPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-foreground-muted">SL</p>
                      <p className="font-mono">{formatPrice(signal.sl)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-foreground-muted">TP</p>
                      <p className="font-mono">{formatPrice(signal.tp)}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })
          )}
        </div>

        {total > 0 && (
          <div className="flex flex-col gap-3 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground-muted">
              Showing {(page - 1) * LIMIT + 1} - {Math.min(page * LIMIT, total)} of{' '}
              {total.toLocaleString()} signals
            </p>
            <div className="flex items-center justify-between gap-2 sm:justify-end">
              <button
                onClick={() => setPage((currentPage) => Math.max(1, currentPage - 1))}
                disabled={page === 1 || isLoading}
                className="rounded-lg p-2 hover:bg-background-elevated disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <span className="px-2 py-2 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((currentPage) => Math.min(totalPages, currentPage + 1))}
                disabled={page === totalPages || isLoading}
                className="rounded-lg p-2 hover:bg-background-elevated disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next page"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedSignal && (
        <SignalDetailsModal
          signal={selectedSignal}
          onClose={() => setSelectedSignal(null)}
        />
      )}
    </div>
  );
}
