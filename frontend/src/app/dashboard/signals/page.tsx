'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { signalApi } from '@/lib/api';

interface Signal {
  id: string;
  action: string;
  symbol: string;
  type: 'BUY' | 'SELL';
  volume: number;
  price: number;
  sl: number | null;
  tp: number | null;
  status: string;
  createdAt: string;
  execution: {
    status: string;
    executedAt: string | null;
    executedPrice: number | null;
  } | null;
}

export default function SignalsPage() {
  const { accessToken } = useAuthStore();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const limit = 20;

  const fetchSignals = async () => {
    if (!accessToken) return;
    setIsLoading(true);

    try {
      const result = await signalApi.getHistory(accessToken, {
        limit,
        offset: (page - 1) * limit,
        symbol: search || undefined,
      });

      if (result.data) {
        setSignals(result.data.signals);
        setTotal(result.data.total);
      }
    } catch (error) {
      console.error('Failed to fetch signals:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [accessToken, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSignals();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">Signal History</h1>
          <p className="text-sm sm:text-base text-foreground-muted">
            View all trading signals and their execution status
          </p>
        </div>
        <button
          onClick={fetchSignals}
          disabled={isLoading}
          className="btn-secondary flex items-center justify-center gap-2 py-2 px-3 sm:px-4 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="card p-3 sm:p-6">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-foreground-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by symbol"
              className="input pl-10 sm:pl-12 text-sm sm:text-base"
            />
          </div>
          <button type="submit" className="btn-primary px-4 sm:px-6 py-2 text-sm sm:text-base">
            Search
          </button>
        </form>
      </div>

      {/* Signals Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 sm:py-4 px-2 sm:px-4 font-medium text-foreground-muted text-xs sm:text-sm">Time</th>
                <th className="text-left py-2 sm:py-4 px-2 sm:px-4 font-medium text-foreground-muted text-xs sm:text-sm">Symbol</th>
                <th className="text-left py-2 sm:py-4 px-2 sm:px-4 font-medium text-foreground-muted text-xs sm:text-sm">Type</th>
                <th className="text-left py-2 sm:py-4 px-2 sm:px-4 font-medium text-foreground-muted text-xs sm:text-sm">Action</th>
                <th className="text-right py-2 sm:py-4 px-2 sm:px-4 font-medium text-foreground-muted text-xs sm:text-sm">Vol</th>
                <th className="text-right py-2 sm:py-4 px-2 sm:px-4 font-medium text-foreground-muted text-xs sm:text-sm">Price</th>
                <th className="text-right py-2 sm:py-4 px-2 sm:px-4 font-medium text-foreground-muted text-xs sm:text-sm hidden sm:table-cell">SL</th>
                <th className="text-right py-2 sm:py-4 px-2 sm:px-4 font-medium text-foreground-muted text-xs sm:text-sm hidden sm:table-cell">TP</th>
                <th className="text-center py-2 sm:py-4 px-2 sm:px-4 font-medium text-foreground-muted text-xs sm:text-sm">Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : signals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-foreground-muted">
                    No signals found
                  </td>
                </tr>
              ) : (
                signals.map((signal, i) => (
                  <motion.tr
                    key={signal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border hover:bg-background-elevated/50"
                  >
                    <td className="py-4 px-4 font-mono text-sm">
                      {new Date(signal.createdAt).toLocaleString()}
                    </td>
                    <td className="py-4 px-4 font-semibold">{signal.symbol}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-sm font-medium ${
                        signal.type === 'BUY' 
                          ? 'bg-accent-green/10 text-accent-green' 
                          : 'bg-accent-red/10 text-accent-red'
                      }`}>
                        {signal.type === 'BUY' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {signal.type}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded text-sm ${
                        signal.action === 'OPEN' ? 'bg-primary/10 text-primary' :
                        signal.action === 'CLOSE' ? 'bg-accent-purple/10 text-accent-purple' :
                        'bg-accent-yellow/10 text-accent-yellow'
                      }`}>
                        {signal.action}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right font-mono">{signal.volume}</td>
                    <td className="py-4 px-4 text-right font-mono">{signal.price.toFixed(5)}</td>
                    <td className="py-4 px-4 text-right font-mono text-foreground-muted">
                      {signal.sl?.toFixed(5) || '-'}
                    </td>
                    <td className="py-4 px-4 text-right font-mono text-foreground-muted">
                      {signal.tp?.toFixed(5) || '-'}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        signal.execution?.status === 'EXECUTED' ? 'bg-accent-green/10 text-accent-green' :
                        signal.execution?.status === 'FAILED' ? 'bg-accent-red/10 text-accent-red' :
                        signal.execution?.status === 'EXPIRED' ? 'bg-foreground-subtle/10 text-foreground-subtle' :
                        'bg-accent-yellow/10 text-accent-yellow'
                      }`}>
                        {signal.execution?.status || signal.status}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-border">
            <p className="text-sm text-foreground-muted">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} signals
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg hover:bg-background-elevated disabled:opacity-50 disabled:cursor-not-allowed"
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
