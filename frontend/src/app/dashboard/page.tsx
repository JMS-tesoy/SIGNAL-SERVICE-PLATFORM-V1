'use client';

import { useEffect, useState } from 'react';
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

function StatCard({ title, value, change, icon: Icon, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="card"
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 text-sm ${change >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
            {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-foreground-muted text-sm mb-1">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
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
  status: string;
  createdAt: string;
}

function SignalRow({ signal }: { signal: RecentSignal }) {
  const isBuy = signal.type === 'BUY';
  
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between py-3 border-b border-border last:border-0"
    >
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          isBuy ? 'bg-accent-green/10' : 'bg-accent-red/10'
        }`}>
          {isBuy ? (
            <TrendingUp className="w-5 h-5 text-accent-green" />
          ) : (
            <TrendingDown className="w-5 h-5 text-accent-red" />
          )}
        </div>
        <div>
          <p className="font-medium">{signal.symbol}</p>
          <p className="text-sm text-foreground-muted">
            {signal.type} • {signal.volume} lots
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono">{signal.price.toFixed(5)}</p>
        <p className={`text-sm ${
          signal.status === 'EXECUTED' ? 'text-accent-green' : 
          signal.status === 'FAILED' ? 'text-accent-red' : 'text-foreground-muted'
        }`}>
          {signal.status}
        </p>
      </div>
    </motion.div>
  );
}

interface MT5Account {
  id: string;
  accountId: string;
  accountType: string;
  isConnected: boolean;
  balance: number;
  equity: number;
  profit: number;
}

function AccountCard({ account }: { account: MT5Account }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className={`status-dot ${account.isConnected ? 'online' : 'offline'}`} />
        <div>
          <p className="font-medium">{account.accountId}</p>
          <p className="text-sm text-foreground-muted">{account.accountType}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-mono">${account.balance?.toFixed(2) || '0.00'}</p>
        <p className={`text-sm ${account.profit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {account.profit >= 0 ? '+' : ''}{account.profit?.toFixed(2) || '0.00'}
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
  const [performancePeriod, setPerformancePeriod] = useState<'7D' | '30D' | '90D'>('90D');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        // Fetch signal stats
        const statsResult = await signalApi.getStats(accessToken, 'month');
        if (statsResult.data) {
          setStats(statsResult.data);
        }

        // Fetch recent signals
        const signalsResult = await signalApi.getHistory(accessToken, { limit: 5 });
        if (signalsResult.data) {
          setRecentSignals(signalsResult.data.signals);
        }

        // Fetch MT5 accounts
        const accountsResult = await userApi.getMT5Accounts(accessToken);
        if (accountsResult.data) {
          setAccounts(accountsResult.data.accounts);
        }

        // Fetch signal limit
        const limitResult = await subscriptionApi.getSignalLimit(accessToken);
        if (limitResult.data) {
          setSignalLimit(limitResult.data);
        }

        // Fetch performance data
        const performanceResult = await signalApi.getPerformance(accessToken, performancePeriod);
        if (performanceResult.data?.data) {
          setPerformanceData(performanceResult.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken, setStats, performancePeriod]);

  const winRate = stats && stats.executed > 0 
    ? Math.round(((stats.executed - stats.failed) / stats.executed) * 100) 
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-32 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Dashboard</h1>
        <p className="text-foreground-muted">
          Overview of your trading activity and performance
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Signals"
          value={stats?.totalSignals || 0}
          change={12}
          icon={Signal}
          color="bg-gradient-to-br from-primary to-primary-hover"
        />
        <StatCard
          title="Executed"
          value={stats?.executed || 0}
          change={8}
          icon={CheckCircle}
          color="bg-gradient-to-br from-accent-green to-emerald-600"
        />
        <StatCard
          title="Win Rate"
          value={`${winRate}%`}
          change={5}
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <PerformanceChart
            data={performanceData}
            isLoading={isLoading}
            period={performancePeriod}
            onPeriodChange={setPerformancePeriod}
          />
        </div>
        <div className="card">
          <WinLossDonut
            wins={stats?.executed || 0}
            losses={stats?.failed || 0}
            pending={stats?.skipped || 0}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Analytics Charts - Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <SymbolBarChart
            data={stats?.bySymbol}
            isLoading={isLoading}
          />
        </div>
        <div className="card">
          <SuccessGauge
            rate={winRate}
            isLoading={isLoading}
          />
        </div>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Signals */}
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Recent Signals</h2>
            <a href="/dashboard/signals" className="text-primary text-sm hover:underline">
              View All
            </a>
          </div>
          
          {recentSignals.length > 0 ? (
            <div className="space-y-1">
              {recentSignals.map((signal) => (
                <SignalRow key={signal.id} signal={signal} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-foreground-muted">
              <Signal className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No signals yet</p>
              <p className="text-sm">Signals will appear here when received</p>
            </div>
          )}
        </div>

        {/* MT5 Accounts */}
        <div className="card">
          <div className="flex items-center justify-between mb-6">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.a
          href="/dashboard/accounts"
          className="card hover:border-primary/50 transition-all duration-300 group"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Connect Account</p>
              <p className="text-sm text-foreground-muted">Add your MT5 account</p>
            </div>
          </div>
        </motion.a>

        <motion.a
          href="/dashboard/subscription"
          className="card hover:border-accent-green/50 transition-all duration-300 group"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-green/10 flex items-center justify-center group-hover:bg-accent-green/20 transition">
              <TrendingUp className="w-6 h-6 text-accent-green" />
            </div>
            <div>
              <p className="font-semibold">Upgrade Plan</p>
              <p className="text-sm text-foreground-muted">Get more signals</p>
            </div>
          </div>
        </motion.a>

        <motion.a
          href="/dashboard/security"
          className="card hover:border-accent-purple/50 transition-all duration-300 group"
          whileHover={{ y: -2 }}
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent-purple/10 flex items-center justify-center group-hover:bg-accent-purple/20 transition">
              <Activity className="w-6 h-6 text-accent-purple" />
            </div>
            <div>
              <p className="font-semibold">Enable 2FA</p>
              <p className="text-sm text-foreground-muted">Secure your account</p>
            </div>
          </div>
        </motion.a>
      </div>
    </div>
  );
}
