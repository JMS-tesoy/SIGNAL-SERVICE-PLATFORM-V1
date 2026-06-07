'use client';

import { motion } from 'framer-motion';
import type { RecentSignal } from '../types';
import {
  formatCompactDateTime,
  formatMoneyValue,
  formatSignedTradePrice,
  formatTradePrice,
  getValueTone,
} from '../utils';

export function PositionResultRow({ signal }: { signal: RecentSignal }) {
  const status = signal.execution?.status || signal.status;
  const reportedAt = signal.execution?.executedAt ?? signal.createdAt;
  const openPrice =
    signal.openPrice ??
    (signal.action !== 'CLOSE' ? signal.execution?.executedPrice : null) ??
    signal.price ??
    null;
  const closePrice =
    signal.closePrice ??
    signal.execution?.closePrice ??
    (signal.action === 'CLOSE' ? signal.execution?.executedPrice : null) ??
    null;
  const isClosedExecution = status === 'EXECUTED' && typeof closePrice === 'number';
  const priceMove =
    signal.priceDifference ??
    (typeof openPrice === 'number' && typeof closePrice === 'number'
      ? closePrice - openPrice
      : null);
  const profit = signal.resultPnl ?? signal.execution?.profit ?? signal.profit;
  const pnl = signal.resultPnl ?? signal.execution?.pnl ?? signal.pnl ?? profit;
  const hasReportedResult = typeof pnl === 'number';
  const resultLabel =
    signal.resultSource === 'CALCULATED_FROM_PRICES'
      ? 'Calculated PnL'
      : 'Realized PnL';

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="grid grid-cols-[minmax(0,1.35fr)_minmax(82px,0.7fr)_minmax(82px,0.7fr)_minmax(82px,0.7fr)_minmax(110px,0.85fr)] gap-3 border-b border-border py-3 last:border-0"
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
        <p className="truncate font-mono text-xs font-medium sm:text-sm">
          {formatTradePrice(openPrice)}
        </p>
      </div>
      <div className="min-w-0 text-right">
        <p className="truncate font-mono text-xs font-medium sm:text-sm">
          {isClosedExecution ? formatTradePrice(closePrice) : 'Pending'}
        </p>
      </div>
      <div className="min-w-0 text-right">
        <p className={`truncate font-mono text-xs font-medium sm:text-sm ${getValueTone(priceMove)}`}>
          {formatSignedTradePrice(priceMove)}
        </p>
      </div>
      <div className="min-w-0 text-right">
        {hasReportedResult ? (
          <>
            <p className={`truncate font-mono font-semibold ${getValueTone(pnl)}`}>
              {formatMoneyValue(pnl)}
            </p>
            <p className={`truncate text-xs ${getValueTone(pnl)}`}>
              {resultLabel}
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
