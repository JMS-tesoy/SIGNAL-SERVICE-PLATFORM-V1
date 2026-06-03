import type { MT5Account } from '../types';

export function AccountCard({ account }: { account: MT5Account }) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-border py-3 last:border-0">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`status-dot ${account.isConnected ? 'online' : 'offline'}`} />
        <div className="min-w-0">
          <p className="truncate font-medium">{account.accountId}</p>
          <p className="text-sm text-foreground-muted">{account.accountType}</p>
        </div>
      </div>
      <div className="min-w-0 text-right">
        <p className="truncate font-mono text-sm sm:text-base">
          ${account.balance?.toFixed(2) || '0.00'}
        </p>
        <p className={`text-sm ${(account.profit ?? 0) >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
          {(account.profit ?? 0) >= 0 ? '+' : ''}
          {account.profit?.toFixed(2) || '0.00'}
        </p>
      </div>
    </div>
  );
}
