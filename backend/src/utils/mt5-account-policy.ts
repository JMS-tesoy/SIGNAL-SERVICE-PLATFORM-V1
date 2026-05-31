type AccountType = "MASTER" | "SLAVE";
type AccountEnvironment = "DEMO" | "LIVE";

type SubscriptionForMt5Policy = {
  status: string;
  tier: {
    name: string;
    maxSlaveAccounts: number;
    features?: unknown;
  };
} | null;

const ACTIVE_SIGNAL_STATUSES = new Set(["ACTIVE", "TRIAL", "TRIALING"]);
const TRIAL_STATUSES = new Set(["TRIAL", "TRIALING"]);
const TRIAL_DEMO_ONLY_MESSAGE =
  "Trial accounts can only use demo MT5/MT4 accounts. Upgrade to connect live accounts.";

function getSubscriptionStatus(subscription: SubscriptionForMt5Policy) {
  return subscription?.status?.toUpperCase() ?? null;
}

export function isTrialSubscription(subscription: SubscriptionForMt5Policy) {
  const status = getSubscriptionStatus(subscription);
  return Boolean(status && TRIAL_STATUSES.has(status));
}

export function hasSignalActiveSubscription(subscription: SubscriptionForMt5Policy) {
  const status = getSubscriptionStatus(subscription);
  return Boolean(status && ACTIVE_SIGNAL_STATUSES.has(status));
}

export function canUseLiveMt5Accounts(subscription: SubscriptionForMt5Policy) {
  const status = getSubscriptionStatus(subscription);

  if (!subscription || status !== "ACTIVE") {
    return false;
  }

  if (subscription.tier.name === "free") {
    return false;
  }

  // TODO: Replace this conservative default with tier.allowLiveAccounts when
  // subscription tier metadata is formalized.
  return true;
}

export function inferMt5AccountEnvironment(input: {
  broker?: string | null;
  server?: string | null;
}): AccountEnvironment {
  const value = `${input.broker ?? ""} ${input.server ?? ""}`;
  return /\b(demo|trial|practice)\b/i.test(value) ? "DEMO" : "LIVE";
}

export function getMt5EnvironmentEligibilityError(input: {
  subscription: SubscriptionForMt5Policy;
  accountEnvironment: AccountEnvironment;
}) {
  const { subscription, accountEnvironment } = input;

  if (!hasSignalActiveSubscription(subscription)) {
    return "An active subscription is required to manage MT5 account signal access.";
  }

  if (isTrialSubscription(subscription) && accountEnvironment === "LIVE") {
    return TRIAL_DEMO_ONLY_MESSAGE;
  }

  if (accountEnvironment === "LIVE" && !canUseLiveMt5Accounts(subscription)) {
    return "Your subscription plan does not allow live MT5/MT4 accounts. Upgrade to connect live accounts.";
  }

  return null;
}

export function getMt5AccountEligibilityError(input: {
  accountType: AccountType;
  accountEnvironment: AccountEnvironment;
  subscription: SubscriptionForMt5Policy;
  currentSlaveCount?: number;
}) {
  const {
    accountType,
    accountEnvironment,
    subscription,
    currentSlaveCount = 0,
  } = input;
  const environmentError = getMt5EnvironmentEligibilityError({
    subscription,
    accountEnvironment,
  });

  if (environmentError) {
    return environmentError;
  }

  if (accountType === "MASTER") {
    if (!subscription || !hasSignalActiveSubscription(subscription)) {
      return "An active paid subscription is required to add master accounts.";
    }

    if (!isTrialSubscription(subscription) && subscription.tier.name === "free") {
      return "Master Signal Provider accounts require a paid plan.";
    }

    return null;
  }

  if (!subscription || !hasSignalActiveSubscription(subscription)) {
    return "An active subscription is required to add slave accounts.";
  }

  if (currentSlaveCount >= subscription.tier.maxSlaveAccounts) {
    return `Your plan allows ${subscription.tier.maxSlaveAccounts} slave account(s). Upgrade to add more.`;
  }

  return null;
}

export function getMt5AssignmentEligibilityError(input: {
  subscription: SubscriptionForMt5Policy;
  receiver: {
    accountEnvironment: AccountEnvironment;
  };
  master: {
    accountEnvironment: AccountEnvironment;
  };
}) {
  const { subscription, receiver, master } = input;

  const receiverEnvironmentError = getMt5EnvironmentEligibilityError({
    subscription,
    accountEnvironment: receiver.accountEnvironment,
  });

  if (receiverEnvironmentError) {
    return receiverEnvironmentError;
  }

  const masterEnvironmentError = getMt5EnvironmentEligibilityError({
    subscription,
    accountEnvironment: master.accountEnvironment,
  });

  if (masterEnvironmentError) {
    return masterEnvironmentError;
  }

  if (receiver.accountEnvironment !== master.accountEnvironment) {
    return "Receiver and Master account environments must match. Demo Receivers can only follow Demo Masters, and Live Receivers can only follow Live Masters.";
  }

  return null;
}
