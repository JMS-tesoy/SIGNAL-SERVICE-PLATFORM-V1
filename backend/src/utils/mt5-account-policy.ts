type AccountType = "MASTER" | "SLAVE";

type SubscriptionForMt5Policy = {
  status: string;
  tier: {
    name: string;
    maxSlaveAccounts: number;
  };
} | null;

export function getMt5AccountEligibilityError(input: {
  accountType: AccountType;
  subscription: SubscriptionForMt5Policy;
  currentSlaveCount?: number;
}) {
  const { accountType, subscription, currentSlaveCount = 0 } = input;

  if (accountType === "MASTER") {
    if (!subscription || subscription.status !== "ACTIVE") {
      return "An active paid subscription is required to add master accounts.";
    }

    if (subscription.tier.name === "free") {
      return "Master Signal Provider accounts require a paid plan.";
    }

    return null;
  }

  if (!subscription || subscription.status !== "ACTIVE") {
    return "An active subscription is required to add slave accounts.";
  }

  if (currentSlaveCount >= subscription.tier.maxSlaveAccounts) {
    return `Your plan allows ${subscription.tier.maxSlaveAccounts} slave account(s). Upgrade to add more.`;
  }

  return null;
}
