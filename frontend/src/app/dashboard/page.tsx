'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Signal,
  Wallet,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore, useSignalStore } from '@/lib/store';
import { signalApi, subscriptionApi, userApi } from '@/lib/api';
import {
  PerformanceChart,
  WinLossDonut,
  SymbolBarChart,
  SuccessGauge,
} from '@/components/charts';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
}

const compactNumberFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

function formatMetricValue(value: string | number) {
  if (typeof value === 'number') {
    return compactNumberFormatter.format(value);
  }

  return value;
}

function StatCard({ title, value, change, icon: Icon, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card min-w-0 p-4 sm:p-5 xl:p-6"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${color}`}>
          <Icon className="h-5 w-5 text-white sm:h-6 sm:w-6" />
        </div>
        {change !== undefined && (
          <div className={`flex flex-shrink-0 items-center gap-1 text-xs sm:text-sm ${change >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="mb-1 truncate text-sm text-foreground-muted">{title}</p>
      <p className="break-words text-2xl font-bold leading-tight sm:text-3xl">
        {formatMetricValue(value)}
      </p>
    </motion.div>
  );
}

interface RecentSignal {
  id: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  action: string;
  volume: number;
  price: number;
  closePrice?: number | null;
  profit?: number | null;
  pnl?: number | null;
  status: string;
  createdAt: string;
  execution?: {
    status: string;
    executedAt?: string | null;
    executedPrice?: number | null;
    closePrice?: number | null;
    profit?: number | null;
    pnl?: number | null;
  } | null;
}

function formatTradePrice(value: number | null | undefined) {
  return typeof value === 'number' ? value.toFixed(5) : '-';
}

function formatMoneyValue(value: number | null | undefined) {
  if (typeof value !== 'number') return '-';

  return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
}

function getValueTone(value: number | null | undefined) {
  if (typeof value !== 'number') return 'text-foreground-muted';

  return value >= 0 ? 'text-accent-green' : 'text-accent-red';
}

function PositionResultRow({ signal }: { signal: RecentSignal }) {
  const status = signal.execution?.status || signal.status;
  const isClosedExecution = signal.action === 'CLOSE' && status === 'EXECUTED';
  const closePrice =
    signal.execution?.closePrice ??
    signal.closePrice ??
    (isClosedExecution ? signal.execution?.executedPrice : null);
  const profit = signal.execution?.profit ?? signal.profit;
  const pnl = signal.execution?.pnl ?? signal.pnl ?? profit;
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-3 gap-3 border-b border-border py-3 last:border-0"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">
          {isClosedExecution ? formatTradePrice(closePrice) : '-'}
        </p>
        <p className="truncate text-xs text-foreground-muted">
          {signal.symbol} {signal.action}
        </p>
      </div>
      <div className="min-w-0 text-right">
        <p className={`truncate font-mono font-medium ${getValueTone(profit)}`}>
          {formatMoneyValue(profit)}
        </p>
        <p className="truncate text-xs text-foreground-muted">
          Profit
        </p>
      </div>
      <div className="min-w-0 text-right">
        <p className={`truncate font-mono font-medium ${getValueTone(pnl)}`}>
          {formatMoneyValue(pnl)}
        </p>
        <p className="truncate text-xs text-foreground-muted">
          PnL
        </p>
      </div>
    </motion.div>
  );
}

type PerformanceSource = 'ACCOUNT_SNAPSHOT' | 'SIGNAL_EXECUTION';
type PerformanceGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

function getPerformanceRequestGranularity(granularity: PerformanceGranularity) {
  return granularity === 'hourly' || granularity === 'daily' ? 'hourly' : 'daily';
}

interface MT5Account {
  id: string;
  accountId: string;
  accountType: string;
  isConnected: boolean;
  balance: number | null;
  equity: number | null;
  profit: number | null;
}

function AccountCard({ account }: { account: MT5Account }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`status-dot ${account.isConnected ? 'online' : 'offline'}`} />
        <div className="min-w-0">
          <p className="truncate font-medium">{account.accountId}</p>
          <p className="text-sm text-foreground-muted">{account.accountType}</p>
        </div>
      </div>
      <div className="min-w-0 text-right">
        <p className="truncate font-mono text-sm sm:text-base">${account.balance?.toFixed(2) || '0.00'}</p>
        <p className={`text-sm ${(account.profit ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {(account.profit ?? 0) >= 0 ? '+' : ''}{account.profit?.toFixed(2) || '0.00'}
        </p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { accessToken } = useAuthStore();
  const { stats, setStats } = useSignalStore();
  const [recentSignals, setRecentSignals] = useState<RecentSignal[]>([]);
  const [accounts, setAccounts] = useState<MT5Account[]>([]);
  const [signalLimit, setSignalLimit] = useState({ remaining: 0, limit: 0 });
  const [performanceData, setPerformanceData] = useState<{ date: string; growth: number; drawdown: number }[]>([]);
  const [performanceSummary, setPerformanceSummary] = useState('');
  const [performanceSource, setPerformanceSource] = useState<PerformanceSource>('ACCOUNT_SNAPSHOT');
  const [performanceGranularity, setPerformanceGranularity] =
    useState<PerformanceGranularity>('daily');
  const [isLoading, setIsLoading] = useState(true);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(true);
  const [isRefreshingPerformance, setIsRefreshingPerformance] = useState(false);
  const [overviewError, setOverviewError] = useState('');
  const [performanceError, setPerformanceError] = useState('');
  const performanceRequestIdRef = useRef(0);
  const hasPerformanceLoadedRef = useRef(false);

  const fetchOverviewData = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setOverviewError('');

    try {
      const failures: string[] = [];

      // Fetch signal stats from the same signal-history visibility rules used by the Signals page.
      const statsResult = await signalApi.getStats(accessToken, 'all');
      if (statsResult.data) {
        setStats(statsResult.data);
      } else if (statsResult.error) {
        failures.push(`Stats: ${statsResult.error}`);
      }

      const recentSignalsResult = await signalApi.getHistory(accessToken, {
        limit: 5,
        action: 'close',
        status: 'executed',
      });
      if (recentSignalsResult.data) {
        setRecentSignals(recentSignalsResult.data.signals as RecentSignal[]);
      } else if (recentSignalsResult.error) {
        failures.push(`Recent signals: ${recentSignalsResult.error}`);
      }

      // Fetch MT5 accounts
      const accountsResult = await userApi.getMT5Accounts(accessToken);
      if (accountsResult.data) {
        setAccounts(accountsResult.data.accounts);
      } else if (accountsResult.error) {
        failures.push(`MT5 accounts: ${accountsResult.error}`);
      }

      // Fetch signal limit
      const limitResult = await subscriptionApi.getSignalLimit(accessToken);
      if (limitResult.data) {
        setSignalLimit(limitResult.data);
      } else if (limitResult.error) {
        failures.push(`Signal limit: ${limitResult.error}`);
      }

      if (failures.length > 0) {
        setOverviewError(failures.join(' '));
      }
    } catch (overviewFetchError) {
      console.error('Failed to fetch dashboard overview data:', overviewFetchError);
      setOverviewError('Failed to fetch dashboard overview data.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, setStats]);

  const fetchTradingPerformance = useCallback(async () => {
    if (!accessToken) {
      setIsPerformanceLoading(false);
      setIsRefreshingPerformance(false);
      return;
    }

    const requestId = performanceRequestIdRef.current + 1;
    performanceRequestIdRef.current = requestId;

    if (hasPerformanceLoadedRef.current) {
      setIsRefreshingPerformance(true);
    } else {
      setIsPerformanceLoading(true);
    }

    setPerformanceError('');

    try {
      // Trading performance comes from MT5 heartbeat balance/equity snapshots.
      const performanceResult = await signalApi.getPerformance(
        accessToken,
        '90D',
        getPerformanceRequestGranularity(performanceGranularity)
      );

      if (performanceRequestIdRef.current !== requestId) {
        return;
      }

      if (performanceResult.data) {
        const source = performanceResult.data.source || 'ACCOUNT_SNAPSHOT';
        setPerformanceSource(source);
        setPerformanceData(performanceResult.data.data);
        setPerformanceSummary(
          performanceResult.data.message ||
            (performanceResult.data.data.length > 0
              ? source === 'SIGNAL_EXECUTION'
                ? 'Trading performance from executed OPEN/CLOSE trades'
                : 'Balance growth and equity drawdown from MT5 account snapshots'
              : 'No trading performance data available')
        );
      } else if (performanceResult.error) {
        setPerformanceError(`Trading performance: ${performanceResult.error}`);
      }
    } catch (performanceFetchError) {
      if (performanceRequestIdRef.current !== requestId) {
        return;
      }

      console.error('Failed to fetch trading performance data:', performanceFetchError);
      setPerformanceError('Failed to fetch trading performance data.');
    } finally {
      if (performanceRequestIdRef.current === requestId) {
        hasPerformanceLoadedRef.current = true;
        setIsPerformanceLoading(false);
        setIsRefreshingPerformance(false);
      }
    }
  }, [accessToken, performanceGranularity]);

  useEffect(() => {
    fetchOverviewData();
  }, [fetchOverviewData]);

  useEffect(() => {
    fetchTradingPerformance();
  }, [fetchTradingPerformance]);

  const handleDashboardRetry = () => {
    fetchOverviewData();
    fetchTradingPerformance();
  };

  const dashboardError = [overviewError, performanceError].filter(Boolean).join(' ');

  const needAttention =
    (stats?.failed || 0) +
    (stats?.skipped || 0) +
    (stats?.expired || 0) +
    (stats?.canceled || 0);
  const completedSignals = (stats?.executed || 0) + needAttention;
  const successRate = completedSignals > 0
    ? Math.round(((stats?.executed || 0) / completedSignals) * 1000) / 10
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-32 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-4 sm:space-y-6">
      {/* Page header */}
      <div>
        <h1 className="mb-2 text-2xl font-display font-bold sm:text-3xl">Dashboard</h1>
        <p className="text-sm text-foreground-muted sm:text-base">
          Overview of your trading activity and performance
        </p>
      </div>

      {dashboardError && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent-red/20 bg-accent-red/10 p-4 text-accent-red sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium">Some dashboard data could not be loaded</p>
              <p className="text-sm text-foreground-muted">{dashboardError}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDashboardRetry}
            className="btn-secondary flex items-center justify-center gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
        <StatCard
          title="Total Signals"
          value={stats?.totalSignals || 0}
          icon={Signal}
          color="bg-gradient-to-br from-primary to-primary-hover"
        />
        <StatCard
          title="Executed"
          value={stats?.executed || 0}
          icon={CheckCircle}
          color="bg-gradient-to-br from-accent-green to-emerald-600"
        />
        <StatCard
          title="Win Rate"
          value={`${successRate}%`}
          icon={Activity}
          color="bg-gradient-to-br from-accent-purple to-violet-600"
        />
        <StatCard
          title="Signals Remaining"
          value={signalLimit.limit === -1 ? '∞' : signalLimit.remaining}
          icon={Clock}
          color="bg-gradient-to-br from-accent-yellow to-amber-600"
        />
      </div>

      {/* Analytics Charts - Row 1 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
        <div className="card min-w-0 p-4 sm:p-5 xl:col-span-2 xl:p-6">
          <PerformanceChart
            data={performanceData}
            isLoading={isPerformanceLoading}
            isRefreshing={isRefreshingPerformance}
            granularity={performanceGranularity}
            onGranularityChange={setPerformanceGranularity}
            title="Trading Performance"
            summary={performanceSummary}
            growthLabel={
              performanceSource === 'SIGNAL_EXECUTION' ? 'Trade return' : 'Balance growth'
            }
            drawdownLabel={
              performanceSource === 'SIGNAL_EXECUTION' ? 'Drawdown' : 'Equity drawdown'
            }
          />
        </div>
        <div className="card min-w-0 p-4 sm:p-5 xl:p-6">
          <WinLossDonut
            wins={stats?.executed || 0}
            losses={stats?.failed || 0}
            pending={(stats?.skipped || 0) + (stats?.expired || 0) + (stats?.canceled || 0)}
            pendingLabel="Need attention"
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Analytics Charts - Row 2 */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:gap-6">
        <div className="card min-w-0 p-4 sm:p-5 xl:p-6">
          <SymbolBarChart
            data={stats?.bySymbol}
            isLoading={isLoading}
          />
        </div>
        <div className="card min-w-0 p-4 sm:p-5 xl:p-6">
          <SuccessGauge
            rate={successRate}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-6">
        {/* Position Results */}
        <div className="card min-w-0 p-4 sm:p-5 xl:col-span-2 xl:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Position Results</h2>
            <a href="/dashboard/signals" className="text-primary text-sm hover:underline">
              View All
            </a>
          </div>
          
          {recentSignals.length > 0 ? (
            <div>
              <div className="grid grid-cols-3 gap-3 border-b border-border pb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
                <span>Close Position</span>
                <span className="text-right">Profit</span>
                <span className="text-right">PnL</span>
              </div>
              {recentSignals.map((signal) => (
                <PositionResultRow key={signal.id} signal={signal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-foreground-muted">
              <Signal className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No position results yet</p>
              <p className="text-sm">Closed position results will appear here when available</p>
            </div>
          )}
        </div>

        {/* MT5 Accounts */}
        <div className="card min-w-0 p-4 sm:p-5 xl:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">MT5 Accounts</h2>
            <a href="/dashboard/accounts" className="text-primary text-sm hover:underline">
              Manage
            </a>
          </div>
          
          {accounts.length > 0 ? (
            <div className="space-y-1">
              {accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-foreground-muted">
              <Wallet className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No accounts connected</p>
              <a href="/dashboard/accounts" className="text-primary text-sm hover:underline">
                Add MT5 Account
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:gap-6">
        <motion.a
          href="/dashboard/accounts"
          className="card group min-w-0 p-4 transition-all duration-300 hover:border-primary/50 sm:p-5 xl:p-6"
          whileHover={{ y: -2 }}
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Connect Account</p>
              <p className="truncate text-sm text-foreground-muted">Add your MT5 account</p>
            </div>
          </div>
        </motion.a>

        <motion.a
          href="/dashboard/subscription"
          className="card group min-w-0 p-4 transition-all duration-300 hover:border-accent-green/50 sm:p-5 xl:p-6"
          whileHover={{ y: -2 }}
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center group-hover:bg-accent-green/20 transition">
              <TrendingUp className="w-6 h-6 text-accent-green" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Upgrade Plan</p>
              <p className="truncate text-sm text-foreground-muted">Get more signals</p>
            </div>
          </div>
        </motion.a>

        <motion.a
          href="/dashboard/security"
          className="card group min-w-0 p-4 transition-all duration-300 hover:border-accent-purple/50 sm:p-5 xl:p-6"
          whileHover={{ y: -2 }}
        >
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center group-hover:bg-accent-purple/20 transition">
              <Activity className="w-6 h-6 text-accent-purple" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold">Enable 2FA</p>
              <p className="truncate text-sm text-foreground-muted">Secure your account</p>
            </div>
          </div>
        </motion.a>
      </div>
    </div>
  );
}
