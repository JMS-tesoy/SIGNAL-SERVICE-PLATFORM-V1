'use client';

import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import type { SignalHistoryResponse } from '@/lib/api';

type SignalDetailsModalProps = {
  signal: SignalHistoryResponse;
  onClose: () => void;
};

function formatDate(value: string | null) {
  if (!value) return '-';

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

function formatSignedPrice(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return `${value >= 0 ? '+' : '-'}${formatPrice(Math.abs(value))}`;
}

function formatMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return '-';
  }

  return `${value >= 0 ? '+' : '-'}$${Math.abs(value).toFixed(2)}`;
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
  if (action === 'OPEN') return 'bg-primary/10 text-primary';
  if (action === 'CLOSE') return 'bg-accent-purple/10 text-accent-purple';
  return 'bg-accent-yellow/10 text-accent-yellow';
}

function getTypeBadgeClass(type: string) {
  return type === 'BUY'
    ? 'bg-accent-green/10 text-accent-green'
    : 'bg-accent-red/10 text-accent-red';
}

function getValueTone(value: number | null | undefined) {
  if (typeof value !== 'number') return 'text-foreground-muted';
  return value >= 0 ? 'text-accent-green' : 'text-accent-red';
}

function formatResultSource(source: SignalHistoryResponse['resultSource']) {
  if (source === 'CALCULATED_FROM_PRICES') return 'Calculated from prices';
  if (source === 'REPORTED_BY_MT5') return 'Reported by MT5';
  return '-';
}

export function SignalDetailsModal({ signal, onClose }: SignalDetailsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const status = getDisplayStatus(signal);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signal-details-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-border bg-background-secondary text-foreground shadow-2xl shadow-black/40 sm:max-w-3xl sm:rounded-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background-secondary p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-sm text-foreground-muted">Signal details</p>
            <h2 id="signal-details-title" className="mt-1 truncate text-xl font-bold">
              {signal.symbol}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className={`rounded px-2 py-1 text-xs font-medium ${getTypeBadgeClass(signal.type)}`}>
                {signal.type}
              </span>
              <span className={`rounded px-2 py-1 text-xs font-medium ${getActionBadgeClass(signal.action)}`}>
                {signal.action}
              </span>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(status)}`}>
                {status}
              </span>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-lg p-2 text-foreground-muted outline-none hover:bg-background-elevated hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Close signal details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <DetailSection title="Trade result">
            <DetailItem label="Open price" value={formatPrice(signal.openPrice)} />
            <DetailItem label="Close price" value={formatPrice(signal.closePrice)} />
            <DetailItem
              label="Changes"
              value={formatSignedPrice(signal.priceDifference)}
              valueClassName={getValueTone(signal.priceDifference)}
            />
            <DetailItem
              label="Result"
              value={formatMoney(signal.resultPnl)}
              valueClassName={getValueTone(signal.resultPnl)}
            />
            <DetailItem label="Result source" value={formatResultSource(signal.resultSource)} />
            <DetailItem label="Matched open signal" value={signal.matchedOpenSignalId || '-'} />
          </DetailSection>

          <DetailSection title="Signal">
            <DetailItem label="Created" value={formatDate(signal.createdAt)} />
            <DetailItem label="Volume" value={formatVolume(signal.volume)} />
            <DetailItem label="Signal price" value={formatPrice(signal.price)} />
            <DetailItem label="Stop loss" value={formatPrice(signal.sl)} />
            <DetailItem label="Take profit" value={formatPrice(signal.tp)} />
          </DetailSection>

          <DetailSection title="Execution">
            <DetailItem label="Execution status" value={signal.execution?.status || '-'} />
            <DetailItem label="Executed price" value={formatPrice(signal.execution?.executedPrice)} />
            <DetailItem label="Executed time" value={formatDate(signal.execution?.executedAt || null)} />
            <DetailItem label="Reported PnL" value={formatMoney(signal.reportedPnl)} />
            <DetailItem label="Calculated PnL" value={formatMoney(signal.calculatedPnl)} />
            <DetailItem label="Error code" value={signal.execution?.errorCode?.toString() || '-'} />
          </DetailSection>

          {signal.execution?.errorMessage && (
            <div className="rounded-lg border border-accent-red/20 bg-accent-red/5 p-3">
              <p className="text-xs text-foreground-muted">Execution message</p>
              <p className="mt-1 text-sm text-accent-red">
                {signal.execution.errorMessage}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-foreground-muted">
        {title}
      </h3>
      <div className="grid gap-3 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function DetailItem({
  label,
  value,
  valueClassName = '',
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background-tertiary p-3">
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className={`mt-1 break-words font-mono text-sm ${valueClassName}`}>{value}</p>
    </div>
  );
}
