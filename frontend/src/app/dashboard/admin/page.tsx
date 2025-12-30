'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Users,
  Signal,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  CreditCard,
  UserCheck,
  BarChart3,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { adminApi, AdminStats } from '@/lib/api';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
  href?: string;
}

function StatCard({ title, value, change, icon: Icon, color, href }: StatCardProps) {
  const content = (
    <motion.div variants={item} className="card group hover:border-primary/30 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
              change >= 0 ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'
            }`}
          >
            {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            {Math.abs(change)}%
          </div>
        )}
      </div>
      <p className="text-foreground-muted text-sm mb-1">{title}</p>
      <p className="text-3xl font-display font-bold">{value}</p>
    </motion.div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

function QuickActionCard({
  title,
  description,
  icon: Icon,
  href,
  color,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
}) {
  return (
    <motion.div variants={item}>
      <Link
        href={href}
        className="card flex items-center gap-4 hover:border-primary/30 transition-all group"
      >
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <p className="font-semibold group-hover:text-primary transition-colors">{title}</p>
          <p className="text-sm text-foreground-muted">{description}</p>
        </div>
      </Link>
    </motion.div>
  );
}

export default function AdminOverviewPage() {
  const { accessToken } = useAuthStore();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      if (!accessToken) return;

      try {
        const result = await adminApi.getStats(accessToken);
        if (result.data) {
          setStats(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch admin stats:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [accessToken]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card h-40 skeleton" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Admin Dashboard</h1>
        <p className="text-foreground-muted">
          Platform overview and management
        </p>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <StatCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          change={12}
          icon={Users}
          color="bg-gradient-to-br from-primary to-cyan-600"
          href="/dashboard/admin/users"
        />
        <StatCard
          title="Active Subscriptions"
          value={stats?.activeSubscriptions || 0}
          change={8}
          icon={CreditCard}
          color="bg-gradient-to-br from-accent-green to-emerald-600"
        />
        <StatCard
          title="Signals Today"
          value={stats?.todaySignals || 0}
          change={15}
          icon={Signal}
          color="bg-gradient-to-br from-accent-purple to-violet-600"
          href="/dashboard/admin/signals"
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats?.monthlyRevenue || 0)}
          change={5}
          icon={DollarSign}
          color="bg-gradient-to-br from-accent-yellow to-amber-600"
          href="/dashboard/admin/revenue"
        />
      </motion.div>

      {/* Secondary Stats */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div variants={item} className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-accent-cyan/10">
              <UserCheck className="w-5 h-5 text-accent-cyan" />
            </div>
            <div>
              <p className="text-foreground-muted text-sm">Active Users</p>
              <p className="text-2xl font-display font-bold">{stats?.activeUsers || 0}</p>
            </div>
          </div>
          <div className="h-2 bg-background-elevated rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-accent-cyan to-primary rounded-full transition-all duration-500"
              style={{
                width: `${stats && stats.totalUsers ? (stats.activeUsers / stats.totalUsers) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="text-sm text-foreground-muted mt-2">
            {stats && stats.totalUsers
              ? ((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)
              : 0}
            % of total users
          </p>
        </motion.div>

        <motion.div variants={item} className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-accent-green/10">
              <Activity className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <p className="text-foreground-muted text-sm">Total Signals</p>
              <p className="text-2xl font-display font-bold">{stats?.totalSignals || 0}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-accent-green" />
            <span className="text-accent-green font-medium">+{stats?.todaySignals || 0}</span>
            <span className="text-foreground-muted">signals today</span>
          </div>
        </motion.div>

        <motion.div variants={item} className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-accent-purple/10">
              <BarChart3 className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <p className="text-foreground-muted text-sm">Total Revenue</p>
              <p className="text-2xl font-display font-bold">{formatCurrency(stats?.totalRevenue || 0)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <TrendingUp className="w-4 h-4 text-accent-green" />
            <span className="text-accent-green font-medium">+{formatCurrency(stats?.monthlyRevenue || 0)}</span>
            <span className="text-foreground-muted">this month</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-display font-semibold mb-4">Quick Actions</h2>
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <QuickActionCard
            title="Manage Users"
            description="View and manage all platform users"
            icon={Users}
            href="/dashboard/admin/users"
            color="bg-gradient-to-br from-primary to-cyan-600"
          />
          <QuickActionCard
            title="Monitor Signals"
            description="Track all trading signals in real-time"
            icon={Signal}
            href="/dashboard/admin/signals"
            color="bg-gradient-to-br from-accent-purple to-violet-600"
          />
          <QuickActionCard
            title="Revenue Reports"
            description="View detailed revenue analytics"
            icon={DollarSign}
            href="/dashboard/admin/revenue"
            color="bg-gradient-to-br from-accent-yellow to-amber-600"
          />
        </motion.div>
      </div>
    </div>
  );
}
