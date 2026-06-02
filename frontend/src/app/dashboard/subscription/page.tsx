'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  AlertCircle,
  CalendarClock,
  Crown,
  Loader2,
  Lock,
  Radio,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { subscriptionApi, type PlanCapabilities } from '@/lib/api';

function formatSignals(limit: number) {
  return limit === -1 ? 'Unlimited' : `${limit}/day`;
}

function formatDelay(seconds: number) {
  return seconds === 0 ? 'Instant' : `${seconds}s delay`;
}

function StatusPill({ status }: { status: string }) {
  const normalizedStatus = status.toUpperCase();
  const active = normalizedStatus === 'ACTIVE';

  return (
    <div
      className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium sm:text-sm ${
        active ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-yellow/10 text-accent-yellow'
      }`}
    >
      {status}
    </div>
  );
}

function EntitlementTile({
  icon: Icon,
  label,
  value,
  locked = false,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  locked?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-background-secondary p-3">
      <Icon className={`mb-2 h-4 w-4 ${locked ? 'text-foreground-muted' : 'text-primary'}`} />
      <p className="text-xs text-foreground-muted">{label}</p>
      <p className="text-sm font-semibold">{value}</p>
    </div>
  );
}

function getCurrentPlanNote(status: string, capabilities: PlanCapabilities) {
  const normalizedStatus = status.toUpperCase();

  if (normalizedStatus === 'TRIAL' || normalizedStatus === 'TRIALING') {
    return 'Trial access is demo-only and short duration. Live accounts and Sender access stay locked until you move to an active paid plan.';
  }

  if (!capabilities.canUseLiveAccounts) {
    return 'Your current plan is limited to demo Receiver access. Upgrade to a paid plan when you need Live or Sender access.';
  }

  return 'Your current paid plan controls Live account access, Sender access, Receiver capacity, signal allowance, and delivery delay.';
}

export default function SubscriptionPage() {
  const { accessToken, subscription, setSubscription } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchCurrentSubscription = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await subscriptionApi.getCurrent(accessToken);

      if (result.data) {
        setSubscription(result.data.subscription);
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError('Failed to fetch your current subscription.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, setSubscription]);

  useEffect(() => {
    fetchCurrentSubscription();
  }, [fetchCurrentSubscription]);

  const handleCancel = async () => {
    if (!accessToken) return;
    if (!confirm('Are you sure you want to cancel your subscription?')) return;

    setActionLoading('cancel');
    setError('');

    try {
      const result = await subscriptionApi.cancel(accessToken);

      if (result.error) {
        setError(result.error);
      } else {
        const currentResult = await subscriptionApi.getCurrent(accessToken);
        if (currentResult.data) {
          setSubscription(currentResult.data.subscription);
        }
      }
    } catch {
      setError('Failed to cancel subscription.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    if (!accessToken) return;

    setActionLoading('resume');
    setError('');

    try {
      const result = await subscriptionApi.resume(accessToken);

      if (result.error) {
        setError(result.error);
      } else {
        const currentResult = await subscriptionApi.getCurrent(accessToken);
        if (currentResult.data) {
          setSubscription(currentResult.data.subscription);
        }
      }
    } catch {
      setError('Failed to resume subscription.');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const capabilities = subscription?.capabilities ?? subscription?.tier.capabilities;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-2 sm:space-y-8 sm:px-0">
      <div>
        <h1 className="mb-2 text-xl font-bold sm:text-2xl">Subscription</h1>
        <p className="text-sm text-foreground-muted sm:text-base">
          View your current plan, billing status, and the MT5 access it unlocks.
        </p>
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-accent-red/20 bg-accent-red/10 p-3 text-sm text-accent-red sm:flex-row sm:items-center sm:justify-between sm:p-4 sm:text-base">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-4 w-4 flex-shrink-0 sm:h-5 sm:w-5" />
            <span className="min-w-0 break-words">{error}</span>
          </div>
          <button
            type="button"
            onClick={fetchCurrentSubscription}
            className="btn-secondary px-4 py-2 text-sm"
          >
            Retry
          </button>
        </div>
      )}

      {!subscription || !capabilities ? (
        <div className="card text-center">
          <AlertCircle className="mx-auto mb-3 h-6 w-6 text-accent-yellow" />
          <h2 className="mb-2 text-base font-semibold">No current plan found</h2>
          <p className="text-sm text-foreground-muted">
            Your account does not have a subscription record yet. Create or restore a plan before connecting MT5 signal access.
          </p>
        </div>
      ) : (
        <>
          <div className="card border-primary/50">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="mb-2 flex items-center gap-2">
                  <Crown className="h-4 w-4 flex-shrink-0 text-accent-yellow sm:h-5 sm:w-5" />
                  <h2 className="text-base font-semibold sm:text-lg">Current Plan</h2>
                </div>
                <p className="truncate text-2xl font-bold text-gradient sm:text-3xl">
                  {subscription.tier.displayName}
                </p>
                <p className="mt-2 max-w-3xl text-xs text-foreground-muted sm:text-sm">
                  {getCurrentPlanNote(subscription.status, capabilities)}
                </p>
              </div>
              <StatusPill status={subscription.status} />
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <EntitlementTile
                icon={Activity}
                label="Signal allowance"
                value={formatSignals(capabilities.maxSignalsPerDay)}
              />
              <EntitlementTile
                icon={Radio}
                label="Receiver accounts"
                value={`${capabilities.maxSlaveAccounts}`}
              />
              <EntitlementTile
                icon={Zap}
                label="Signal delay"
                value={formatDelay(capabilities.signalDelay)}
              />
              <EntitlementTile
                icon={ShieldCheck}
                label="Live accounts"
                value={capabilities.canUseLiveAccounts ? 'Allowed' : 'Locked'}
                locked={!capabilities.canUseLiveAccounts}
              />
              <EntitlementTile
                icon={Lock}
                label="Sender access"
                value={capabilities.canAddMasterAccount ? 'Allowed' : 'Locked'}
                locked={!capabilities.canAddMasterAccount}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="mb-1 text-xs text-foreground-muted sm:text-sm">Billing Cycle</p>
                <p className="text-sm font-medium sm:text-base">{subscription.billingCycle}</p>
              </div>
              <div>
                <p className="mb-1 text-xs text-foreground-muted sm:text-sm">Current Period Ends</p>
                <p className="text-sm font-medium sm:text-base">
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="mb-1 text-xs text-foreground-muted sm:text-sm">Cancellation</p>
                <p className="text-sm font-medium sm:text-base">
                  {subscription.cancelAtPeriodEnd ? 'Ends at period close' : 'Renews normally'}
                </p>
              </div>
            </div>
          </div>

          {subscription.cancelAtPeriodEnd ? (
            <div className="card flex flex-col items-start justify-between gap-3 border-accent-yellow/30 bg-accent-yellow/5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-3">
                <CalendarClock className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent-yellow" />
                <div>
                  <h3 className="text-sm font-semibold">Cancellation Scheduled</h3>
                  <p className="text-xs text-foreground-muted sm:text-sm">
                    Your current access ends on{' '}
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                  </p>
                </div>
              </div>
              <button
                onClick={handleResume}
                disabled={actionLoading === 'resume'}
                className="btn-primary whitespace-nowrap px-3 py-2 text-xs sm:px-4 sm:text-sm"
              >
                {actionLoading === 'resume' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Resume Subscription'
                )}
              </button>
            </div>
          ) : (
            subscription.tier.name !== 'free' && (
              <button
                onClick={handleCancel}
                disabled={actionLoading === 'cancel'}
                className="text-xs text-accent-red hover:underline sm:text-sm"
              >
                {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
              </button>
            )
          )}
        </>
      )}
    </div>
  );
}
