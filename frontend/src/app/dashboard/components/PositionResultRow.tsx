'use client';

import { motion } from 'framer-motion';
import type { RecentSignal } from '../types';
import {
  formatCompactDateTime,
  formatMoneyValue,
  formatTradePrice,
  getValueTone,
} from '../utils';

export function PositionResultRow({ signal }: { signal: RecentSignal }) {
  const status = signal.execution?.status || signal.status;
  const reportedAt = signal.execution?.executedAt ?? signal.createdAt;
  const closePrice =
    signal.execution?.closePrice ??
    signal.closePrice ??
    null;
  const isClosedExecution = status === 'EXECUTED' && typeof closePrice === 'number';
  const profit = signal.execution?.profit ?? signal.profit;
  const pnl = signal.execution?.pnl ?? signal.pnl ?? profit;
  const hasReportedResult = typeof pnl === 'number';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-[minmax(0,1.45fr)_minmax(96px,0.8fr)_minmax(120px,0.9fr)] gap-3 border-b border-border py-3 last:border-0"
    >
      <div className="min-w-0">
        <p className="truncate font-semibold">
          {signal.symbol}
        </p>
        <p className="truncate text-xs text-foreground-muted">
          {signal.type} {signal.action} - {signal.volume} lot
        </p>
        <p className="truncate text-xs text-foreground-muted">
          {formatCompactDateTime(reportedAt)}
        </p>
      </div>
      <div className="min-w-0 text-right">
        <p className="truncate font-mono font-medium">
          {isClosedExecution ? formatTradePrice(closePrice) : 'Pending'}
        </p>
        <p className="truncate text-xs text-foreground-muted">Close price</p>
      </div>
      <div className="min-w-0 text-right">
        {hasReportedResult ? (
          <>
            <p className={`truncate font-mono font-semibold ${getValueTone(pnl)}`}>
              {formatMoneyValue(pnl)}
            </p>
            <p className={`truncate text-xs ${getValueTone(profit)}`}>
              Realized PnL
            </p>
          </>
        ) : (
          <>
            <p className="truncate text-sm font-medium text-foreground-muted">
              Not reported
            </p>
            <p className="truncate text-xs text-foreground-muted">
              Older trade report
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
