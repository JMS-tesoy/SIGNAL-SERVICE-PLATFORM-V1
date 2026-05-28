type Mt5AccountForResponse = {
  id: string;
  accountId: string;
  accountType: string;
  broker: string | null;
  server: string | null;
  isConnected: boolean;
  lastHeartbeat: Date | null;
  apiKey: string | null;
  balance: unknown;
  equity: unknown;
  profit: unknown;
};

type SubscriptionForPlanUsage = {
  status: string;
  tier: {
    maxSlaveAccounts: number;
    name: string;
  };
} | null;

function decimalToNullableNumber(value: unknown) {
  return value ? Number(value) : null;
}

export function formatMt5Account(account: Mt5AccountForResponse) {
  return {
    id: account.id,
    accountId: account.accountId,
    accountType: account.accountType,
    broker: account.broker,
    server: account.server,
    isConnected: account.isConnected,
    lastHeartbeat: account.lastHeartbeat,
    hasApiKey: Boolean(account.apiKey),
    balance: decimalToNullableNumber(account.balance),
    equity: decimalToNullableNumber(account.equity),
    profit: decimalToNullableNumber(account.profit),
  };
}

export function formatPlanUsage(
  subscription: SubscriptionForPlanUsage,
  currentSlaveCount: number
) {
  return {
    currentSlaveAccounts: currentSlaveCount,
    maxSlaveAccounts: subscription?.tier.maxSlaveAccounts ?? 0,
    subscriptionStatus: subscription?.status ?? null,
    tierName: subscription?.tier.name ?? null,
  };
}

export function formatMt5ApiKeyUsage(apiKey: string) {
  return {
    header: "X-API-Key",
    example: `curl -H "X-API-Key: ${apiKey}" https://api.example.com/api/signals`,
  };
}
