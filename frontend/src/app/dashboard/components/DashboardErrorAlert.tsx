import { AlertCircle, RefreshCw } from 'lucide-react';

interface DashboardErrorAlertProps {
  error: string;
  onRetry: () => void;
}

export function DashboardErrorAlert({ error, onRetry }: DashboardErrorAlertProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-accent-red/20 bg-accent-red/10 p-4 text-accent-red sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
        <div>
          <p className="font-medium">Some dashboard data could not be loaded</p>
          <p className="text-sm text-foreground-muted">{error}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRetry}
        className="btn-secondary flex items-center justify-center gap-2 text-sm"
      >
        <RefreshCw className="h-4 w-4" />
        Retry
      </button>
    </div>
  );
}
