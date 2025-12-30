'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Crown, Zap, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { subscriptionApi } from '@/lib/api';

interface Tier {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
  maxSignalsPerDay: number;
  maxSlaveAccounts: number;
  signalDelay: number;
  isPopular: boolean;
}

interface Subscription {
  id: string;
  status: string;
  tier: Tier;
  billingCycle: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export default function SubscriptionPage() {
  const { accessToken, subscription, setSubscription } = useAuthStore();
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tiersResult, currentResult] = await Promise.all([
          subscriptionApi.getTiers(),
          accessToken ? subscriptionApi.getCurrent(accessToken) : Promise.resolve({ data: null }),
        ]);

        if (tiersResult.data) {
          setTiers(tiersResult.data.tiers);
        }

        if (currentResult.data?.subscription) {
          setSubscription(currentResult.data.subscription);
        }
      } catch (err) {
        console.error('Failed to fetch subscription data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken, setSubscription]);

  const handleSubscribe = async (tierId: string) => {
    if (!accessToken) return;
    
    setActionLoading(tierId);
    setError('');

    try {
      const result = await subscriptionApi.createCheckout(accessToken, tierId, billingCycle);
      
      if (result.data?.url) {
        window.location.href = result.data.url;
      } else if (result.error) {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to create checkout session');
    } finally {
      setActionLoading(null);
    }
  };

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
        // Refresh subscription
        const currentResult = await subscriptionApi.getCurrent(accessToken);
        if (currentResult.data?.subscription) {
          setSubscription(currentResult.data.subscription);
        }
      }
    } catch (err) {
      setError('Failed to cancel subscription');
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
        if (currentResult.data?.subscription) {
          setSubscription(currentResult.data.subscription);
        }
      }
    } catch (err) {
      setError('Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-7xl mx-auto px-2 sm:px-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold mb-2">Subscription</h1>
        <p className="text-sm sm:text-base text-foreground-muted">
          Manage your subscription and billing
        </p>
      </div>

      {error && (
        <div className="p-3 sm:p-4 bg-accent-red/10 border border-accent-red/20 rounded-xl flex items-center gap-3 text-accent-red text-sm sm:text-base">
          <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      {/* Current Plan */}
      {subscription && (
        <div className="card border-primary/50">
          <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-accent-yellow flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold">Current Plan</h2>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-gradient truncate">{subscription.tier.displayName}</p>
            </div>
            <div className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap ${
              subscription.status === 'ACTIVE'
                ? 'bg-accent-green/10 text-accent-green'
                : 'bg-accent-yellow/10 text-accent-yellow'
            }`}>
              {subscription.status}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="min-w-0">
              <p className="text-foreground-muted text-xs sm:text-sm mb-1">Billing Cycle</p>
              <p className="font-medium text-sm sm:text-base truncate">{subscription.billingCycle}</p>
            </div>
            <div className="min-w-0">
              <p className="text-foreground-muted text-xs sm:text-sm mb-1">Renewal Date</p>
              <p className="font-medium text-sm sm:text-base truncate">
                {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            </div>
            <div className="min-w-0">
              <p className="text-foreground-muted text-xs sm:text-sm mb-1">Signals/Day</p>
              <p className="font-medium text-sm sm:text-base truncate">
                {subscription.tier.maxSignalsPerDay === -1 ? 'Unlimited' : subscription.tier.maxSignalsPerDay}
              </p>
            </div>
          </div>

          {subscription.cancelAtPeriodEnd ? (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-accent-yellow/10 rounded-xl">
              <p className="text-accent-yellow text-xs sm:text-sm min-w-0 break-words">
                Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
              <button
                onClick={handleResume}
                disabled={actionLoading === 'resume'}
                className="btn-primary py-2 px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap"
              >
                {actionLoading === 'resume' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Resume Subscription'
                )}
              </button>
            </div>
          ) : subscription.tier.name !== 'free' && (
            <button
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
              className="text-accent-red hover:underline text-xs sm:text-sm"
            >
              {actionLoading === 'cancel' ? 'Canceling...' : 'Cancel Subscription'}
            </button>
          )}
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-2 sm:gap-4">
        <span className={`text-xs sm:text-sm ${billingCycle === 'MONTHLY' ? 'text-foreground' : 'text-foreground-muted'}`}>
          Monthly
        </span>
        <button
          onClick={() => setBillingCycle(billingCycle === 'MONTHLY' ? 'YEARLY' : 'MONTHLY')}
          className="relative w-12 h-6 sm:w-14 sm:h-7 bg-background-elevated rounded-full transition"
        >
          <motion.div
            className="absolute top-1 w-4 h-4 sm:w-5 sm:h-5 bg-primary rounded-full"
            animate={{ left: billingCycle === 'MONTHLY' ? 4 : (window.innerWidth < 640 ? 28 : 32) }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
        <span className={`text-xs sm:text-sm ${billingCycle === 'YEARLY' ? 'text-foreground' : 'text-foreground-muted'}`}>
          Yearly <span className="text-accent-green text-[10px] sm:text-xs">(Save 20%)</span>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {tiers.map((tier, i) => {
          const price = billingCycle === 'MONTHLY' ? tier.priceMonthly : tier.priceYearly / 12;
          const isCurrentPlan = subscription?.tier.id === tier.id;

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`card relative ${tier.isPopular ? 'border-primary glow-primary' : ''}`}
            >
              {tier.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2 sm:px-3 py-0.5 sm:py-1 bg-primary text-white text-[10px] sm:text-xs font-medium rounded-full whitespace-nowrap">
                  Most Popular
                </div>
              )}

              <div className="mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-semibold mb-2 truncate">{tier.displayName}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl sm:text-4xl font-bold">
                    ${price.toFixed(0)}
                  </span>
                  <span className="text-foreground-muted text-sm sm:text-base">/month</span>
                </div>
                {billingCycle === 'YEARLY' && (
                  <p className="text-xs sm:text-sm text-foreground-muted mt-1">
                    ${tier.priceYearly.toFixed(0)} billed yearly
                  </p>
                )}
                <p className="text-foreground-muted mt-2 text-xs sm:text-sm">{tier.description}</p>
              </div>

              <ul className="space-y-2 sm:space-y-3 mb-4 sm:mb-6">
                {(tier.features as string[]).slice(0, 5).map((feature, j) => (
                  <li key={j} className="flex items-start gap-2">
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 text-accent-green flex-shrink-0 mt-0.5" />
                    <span className="text-xs sm:text-sm text-foreground-muted break-words">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(tier.id)}
                disabled={isCurrentPlan || actionLoading === tier.id || tier.priceMonthly === 0}
                className={`w-full py-2 sm:py-3 rounded-xl text-sm sm:text-base font-semibold transition flex items-center justify-center gap-2 ${
                  isCurrentPlan
                    ? 'bg-background-elevated text-foreground-muted cursor-default'
                    : tier.isPopular
                    ? 'bg-primary hover:bg-primary-hover text-white'
                    : 'bg-background-elevated hover:bg-background-tertiary border border-border'
                }`}
              >
                {actionLoading === tier.id ? (
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : tier.priceMonthly === 0 ? (
                  'Free Plan'
                ) : (
                  <>
                    Subscribe
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                  </>
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* Features Comparison */}
      <div className="card">
        <h2 className="text-base sm:text-lg font-semibold mb-4 sm:mb-6">Feature Comparison</h2>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Feature</th>
                {tiers.map((tier) => (
                  <th key={tier.id} className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">{tier.displayName}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground-muted text-xs sm:text-sm">Signals per day</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    {tier.maxSignalsPerDay === -1 ? '∞' : tier.maxSignalsPerDay}
                  </td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground-muted text-xs sm:text-sm">MT5 Accounts</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">{tier.maxSlaveAccounts}</td>
                ))}
              </tr>
              <tr className="border-b border-border">
                <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground-muted text-xs sm:text-sm">Signal Delay</td>
                {tiers.map((tier) => (
                  <td key={tier.id} className="text-center py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                    {tier.signalDelay === 0 ? 'Instant' : `${tier.signalDelay}s`}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
