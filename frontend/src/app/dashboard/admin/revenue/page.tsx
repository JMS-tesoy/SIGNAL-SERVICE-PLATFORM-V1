'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { adminApi } from '@/lib/api';

const TIER_COLORS: Record<string, string> = {
  free: '#64748b',
  basic: '#0ea5e9',
  pro: '#a855f7',
  premium: '#f59e0b',
};

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

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-xl px-4 py-3 shadow-xl"
      >
        <p className="text-sm text-foreground-muted mb-1">{label}</p>
        <p className="font-display text-lg font-bold text-accent-green">
          ${payload[0].value.toLocaleString()}
        </p>
      </motion.div>
    );
  }
  return null;
};

export default function AdminRevenuePage() {
  const { accessToken } = useAuthStore();
  const [revenueData, setRevenueData] = useState<{
    monthlyRevenue: Record<string, number>;
    total: number;
    byTier: Record<string, number>;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      if (!accessToken) return;

      try {
        const result = await adminApi.getRevenue(accessToken, 12);
        if (result.data) {
          setRevenueData(result.data);
        }
      } catch (error) {
        console.error('Failed to fetch revenue:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRevenue();
  }, [accessToken]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Transform monthly revenue data for chart
  const monthlyChartData = revenueData
    ? Object.entries(revenueData.monthlyRevenue)
        .map(([month, amount]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', {
            month: 'short',
            year: '2-digit',
          }),
          amount,
        }))
        .slice(-12)
    : [];

  // Transform tier data for pie chart
  const tierChartData = revenueData
    ? Object.entries(revenueData.byTier).map(([tier, amount]) => ({
        name: tier.charAt(0).toUpperCase() + tier.slice(1),
        value: amount,
        color: TIER_COLORS[tier.toLowerCase()] || '#64748b',
      }))
    : [];

  // Calculate current month revenue
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const currentMonthRevenue = revenueData?.monthlyRevenue[currentMonthKey] || 0;

  // Calculate previous month revenue for comparison
  const prevDate = new Date();
  prevDate.setMonth(prevDate.getMonth() - 1);
  const prevMonthKey = prevDate.toISOString().slice(0, 7);
  const prevMonthRevenue = revenueData?.monthlyRevenue[prevMonthKey] || 0;
  const monthChange =
    prevMonthRevenue > 0
      ? Math.round(((currentMonthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100)
      : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card h-32 skeleton" />
          ))}
        </div>
        <div className="card h-96 skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Revenue</h1>
        <p className="text-foreground-muted">
          Financial overview and analytics
        </p>
      </div>

      {/* Stats Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div variants={item} className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-green to-emerald-600 flex items-center justify-center shadow-lg">
              <DollarSign className="w-7 h-7 text-white" />
            </div>
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium bg-accent-green/10 text-accent-green">
              <TrendingUp className="w-4 h-4" />
              All Time
            </div>
          </div>
          <p className="text-foreground-muted text-sm mb-1">Total Revenue</p>
          <p className="text-3xl font-display font-bold text-accent-green">
            {formatCurrency(revenueData?.total || 0)}
          </p>
        </motion.div>

        <motion.div variants={item} className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-cyan-600 flex items-center justify-center shadow-lg">
              <Calendar className="w-7 h-7 text-white" />
            </div>
            {monthChange !== 0 && (
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium ${
                  monthChange >= 0
                    ? 'bg-accent-green/10 text-accent-green'
                    : 'bg-accent-red/10 text-accent-red'
                }`}
              >
                <TrendingUp
                  className={`w-4 h-4 ${monthChange < 0 ? 'rotate-180' : ''}`}
                />
                {Math.abs(monthChange)}%
              </div>
            )}
          </div>
          <p className="text-foreground-muted text-sm mb-1">This Month</p>
          <p className="text-3xl font-display font-bold">
            {formatCurrency(currentMonthRevenue)}
          </p>
        </motion.div>

        <motion.div variants={item} className="card">
          <div className="flex items-start justify-between mb-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-purple to-violet-600 flex items-center justify-center shadow-lg">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
          </div>
          <p className="text-foreground-muted text-sm mb-1">Avg. Monthly</p>
          <p className="text-3xl font-display font-bold">
            {formatCurrency(
              monthlyChartData.length > 0
                ? monthlyChartData.reduce((sum, d) => sum + d.amount, 0) /
                    monthlyChartData.length
                : 0
            )}
          </p>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-accent-green/10">
              <TrendingUp className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">
                Monthly Revenue
              </h3>
              <p className="text-sm text-foreground-muted">Last 12 months</p>
            </div>
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlyChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border)"
                  opacity={0.5}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--foreground-subtle)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--foreground-subtle)', fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="amount"
                  fill="url(#revenueGradient)"
                  radius={[6, 6, 0, 0]}
                  animationDuration={1000}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Revenue by Tier */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="card"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 rounded-xl bg-accent-purple/10">
              <CreditCard className="w-5 h-5 text-accent-purple" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold">By Tier</h3>
              <p className="text-sm text-foreground-muted">Revenue breakdown</p>
            </div>
          </div>

          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={tierChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  animationDuration={800}
                >
                  {tierChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.color}
                      style={{ cursor: 'pointer' }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="space-y-2 mt-4">
            {tierChartData.map((tier) => (
              <div key={tier.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <span className="text-sm">{tier.name}</span>
                </div>
                <span className="text-sm font-semibold">
                  {formatCurrency(tier.value)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
