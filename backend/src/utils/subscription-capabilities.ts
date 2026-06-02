type TierLike = {
  name: string;
  maxSignalsPerDay: number;
  maxSlaveAccounts: number;
  signalDelay: number;
};

const SIGNAL_ACTIVE_STATUSES = new Set(["ACTIVE", "TRIAL", "TRIALING"]);

function isPaidTier(tier: TierLike) {
  return tier.name !== "free";
}

export function formatSignalsPerDay(limit: number) {
  return limit === -1 ? "Unlimited" : `${limit}`;
}

export function formatSignalDelay(seconds: number) {
  return seconds === 0 ? "Instant" : `${seconds}s`;
}

export function getTierCapabilities(tier: TierLike) {
  const paidTier = isPaidTier(tier);

  return {
    canAddMasterAccount: paidTier,
    canAddSlaveAccount: tier.maxSlaveAccounts > 0,
    canUseDemoAccounts: true,
    canUseLiveAccounts: paidTier,
    maxSlaveAccounts: tier.maxSlaveAccounts,
    maxSignalsPerDay: tier.maxSignalsPerDay,
    signalDelay: tier.signalDelay,
  };
}

export function getSubscriptionCapabilities(input: {
  status: string;
  tier: TierLike;
}) {
  const status = input.status.toUpperCase();
  const signalActive = SIGNAL_ACTIVE_STATUSES.has(status);
  const paidTier = isPaidTier(input.tier);
  const activePaidTier = status === "ACTIVE" && paidTier;

  return {
    canAddMasterAccount: activePaidTier,
    canAddSlaveAccount: signalActive && input.tier.maxSlaveAccounts > 0,
    canUseDemoAccounts: signalActive,
    canUseLiveAccounts: activePaidTier,
    maxSlaveAccounts: input.tier.maxSlaveAccounts,
    maxSignalsPerDay: input.tier.maxSignalsPerDay,
    signalDelay: input.tier.signalDelay,
  };
}
