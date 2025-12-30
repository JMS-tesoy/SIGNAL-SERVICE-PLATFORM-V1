'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Signal,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  X,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { adminApi, AdminSignal } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-accent-yellow/10 text-accent-yellow',
  ACTIVE: 'bg-primary/10 text-primary',
  EXECUTED: 'bg-accent-green/10 text-accent-green',
  FAILED: 'bg-accent-red/10 text-accent-red',
  EXPIRED: 'bg-foreground-subtle/10 text-foreground-subtle',
  CANCELED: 'bg-foreground-subtle/10 text-foreground-subtle',
};

function SignalRow({ signal }: { signal: AdminSignal }) {
  const isBuy = signal.type === 'BUY';

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-border hover:bg-background-elevated/50 transition-colors"
    >
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              isBuy ? 'bg-accent-green/10' : 'bg-accent-red/10'
            }`}
          >
            {isBuy ? (
              <TrendingUp className="w-5 h-5 text-accent-green" />
            ) : (
              <TrendingDown className="w-5 h-5 text-accent-red" />
            )}
          </div>
          <div>
            <p className="font-mono font-medium">{signal.symbol}</p>
            <p className="text-sm text-foreground-muted">
              {signal.type} • {signal.action}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="font-mono">{signal.volume}</p>
      </td>
      <td className="px-4 py-4">
        <p className="font-mono">{signal.price.toFixed(5)}</p>
      </td>
      <td className="px-4 py-4">
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
            STATUS_COLORS[signal.status]
          }`}
        >
          {signal.status}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-foreground-muted" />
          <span className="text-sm">{signal._count?.executions || 0}</span>
        </div>
      </td>
      <td className="px-4 py-4">
        <div>
          <p className="text-sm">{signal.provider.name || signal.provider.email}</p>
          <p className="text-xs text-foreground-muted">{signal.provider.email}</p>
        </div>
      </td>
      <td className="px-4 py-4 text-sm text-foreground-muted">
        {new Date(signal.createdAt).toLocaleString()}
      </td>
    </motion.tr>
  );
}

export default function AdminSignalsPage() {
  const { accessToken } = useAuthStore();
  const [signals, setSignals] = useState<AdminSignal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [symbol, setSymbol] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchSignals = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const result = await adminApi.getSignals(accessToken, {
        page,
        limit: 15,
        symbol: symbol || undefined,
        status: statusFilter || undefined,
      });

      if (result.data) {
        setSignals(result.data.signals);
        setTotal(result.data.total);
        setPages(result.data.pages);
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, page, symbol, statusFilter]);

  useEffect(() => {
    fetchSignals();
  }, [fetchSignals]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold mb-2">Signals</h1>
        <p className="text-foreground-muted">
          Monitor all trading signals ({total} total)
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground-muted" />
            <input
              type="text"
              placeholder="Search by symbol (e.g., EURUSD)..."
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value.toUpperCase());
                setPage(1);
              }}
              className="input pl-12 font-mono"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-foreground-muted" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="input w-auto"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="EXECUTED">Executed</option>
              <option value="FAILED">Failed</option>
              <option value="EXPIRED">Expired</option>
              <option value="CANCELED">Canceled</option>
            </select>
            {(symbol || statusFilter) && (
              <button
                onClick={() => {
                  setSymbol('');
                  setStatusFilter('');
                  setPage(1);
                }}
                className="p-2 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-background-elevated border-b border-border">
                <th className="text-left px-4 py-3 font-semibold text-sm">Signal</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Volume</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Price</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Executions</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Provider</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Time</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="h-12 skeleton rounded-lg" />
                    </td>
                  </tr>
                ))
              ) : signals.length > 0 ? (
                signals.map((signal) => (
                  <SignalRow key={signal.id} signal={signal} />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-foreground-muted">
                    <Signal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No signals found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-foreground-muted">
              Page {page} of {pages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="p-2 rounded-lg hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
