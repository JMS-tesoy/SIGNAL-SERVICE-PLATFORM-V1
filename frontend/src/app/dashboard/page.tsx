'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  Signal,
  Wallet,
  Activity,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useAuthStore, useSignalStore } from '@/lib/store';
import { API_URL, signalApi, subscriptionApi, userApi } from '@/lib/api';
import {
  PerformanceChart,
  WinLossDonut,
  SymbolBarChart,
  SuccessGauge,
} from '@/components/charts';
import { AccountCard } from './components/AccountCard';
import { DashboardErrorAlert } from './components/DashboardErrorAlert';
import { PositionResultRow } from './components/PositionResultRow';
import { QuickActionCard } from './components/QuickActionCard';
import { StatCard } from './components/StatCard';
import type {
  MT5Account,
  PerformanceGranularity,
  PerformanceSource,
  RecentSignal,
} from './types';
import { getPerformanceRequestGranularity } from './utils';

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

  const fetchOverviewData = useCallback(async (options?: { showLoading?: boolean }) => {
    const showLoading = options?.showLoading ?? true;

    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    if (showLoading) {
      setIsLoading(true);
    }

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
      if (showLoading) {
        setIsLoading(false);
      }
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

  useEffect(() => {
    if (!accessToken) return;

    const controller = new AbortController();
    let refreshTimeout: ReturnType<typeof setTimeout> | null = null;

    const scheduleRealtimeRefresh = () => {
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }

      refreshTimeout = setTimeout(() => {
        fetchOverviewData({ showLoading: false });
        fetchTradingPerformance();
      }, 250);
    };

    const connectDashboardStream = async () => {
      try {
        const response = await fetch(`${API_URL}/api/realtime/dashboard`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          let eventBoundary = buffer.indexOf('\n\n');
          while (eventBoundary !== -1) {
            const eventBlock = buffer.slice(0, eventBoundary);
            buffer = buffer.slice(eventBoundary + 2);

            if (
              eventBlock.includes('event: dashboard:trade-report') ||
              eventBlock.includes('event: dashboard:refresh')
            ) {
              scheduleRealtimeRefresh();
            }

            eventBoundary = buffer.indexOf('\n\n');
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Dashboard realtime stream failed:', error);
        }
      }
    };

    connectDashboardStream();

    return () => {
      controller.abort();
      if (refreshTimeout) {
        clearTimeout(refreshTimeout);
      }
    };
  }, [accessToken, fetchOverviewData, fetchTradingPerformance]);

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
        <DashboardErrorAlert
          error={dashboardError}
          onRetry={handleDashboardRetry}
        />
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
            <div>
              <h2 className="text-lg font-semibold">Trade History</h2>
              <p className="text-sm text-foreground-muted">Latest closed positions</p>
            </div>
            <Link href="/dashboard/signals" className="text-primary text-sm hover:underline">
              View All
            </Link>
          </div>
          
          {recentSignals.length > 0 ? (
            <div>
              <div className="grid grid-cols-[minmax(0,1.45fr)_minmax(96px,0.8fr)_minmax(120px,0.9fr)] gap-3 border-b border-border pb-2 text-xs font-medium uppercase tracking-wide text-foreground-muted">
                <span>Trade</span>
                <span className="text-right">Close</span>
                <span className="text-right">Result</span>
              </div>
              {recentSignals.map((signal) => (
                <PositionResultRow key={signal.id} signal={signal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-foreground-muted">
              <Signal className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No closed trades yet</p>
              <p className="text-sm">Closed trade history will appear here when available</p>
            </div>
          )}
        </div>

        {/* MT5 Accounts */}
        <div className="card min-w-0 p-4 sm:p-5 xl:p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">MT5 Accounts</h2>
            <Link href="/dashboard/accounts" className="text-primary text-sm hover:underline">
              Manage
            </Link>
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
              <Link href="/dashboard/accounts" className="text-primary text-sm hover:underline">
                Add MT5 Account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 xl:gap-6">
        <QuickActionCard
          href="/dashboard/accounts"
          icon={Wallet}
          title="Connect Account"
          description="Add your MT5 account"
          toneClassName="bg-primary/10 text-primary group-hover:bg-primary/20"
          hoverBorderClassName="hover:border-primary/50"
        />
        <QuickActionCard
          href="/dashboard/subscription"
          icon={TrendingUp}
          title="Upgrade Plan"
          description="Get more signals"
          toneClassName="bg-accent-green/10 text-accent-green group-hover:bg-accent-green/20"
          hoverBorderClassName="hover:border-accent-green/50"
        />
        <QuickActionCard
          href="/dashboard/security"
          icon={Activity}
          title="Enable 2FA"
          description="Secure your account"
          toneClassName="bg-accent-purple/10 text-accent-purple group-hover:bg-accent-purple/20"
          hoverBorderClassName="hover:border-accent-purple/50"
        />
      </div>
    </div>
  );
}
