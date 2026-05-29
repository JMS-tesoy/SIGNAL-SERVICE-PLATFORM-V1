type Mt5AccountForResponse = {
  id: string;
  accountId: string;
  accountType: string;
  broker: string | null;
  server: string | null;
  status: string;
  isConnected: boolean;
  lastHeartbeat: Date | null;
  apiKey: string | null;
  apiKeyPrefix: string | null;
  apiKeyRevokedAt: Date | null;
  minEaVersion: string;
  maxDevices: number;
  allowSignalSend: boolean;
  allowSignalReceive: boolean;
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
    status: account.status,
    isConnected: account.isConnected,
    lastHeartbeat: account.lastHeartbeat,
    hasApiKey: Boolean(account.apiKey),
    apiKeyState: account.apiKey
      ? account.apiKeyRevokedAt
        ? "REVOKED"
        : "ACTIVE"
      : "NONE",
    apiKeyPrefix: account.apiKeyPrefix,
    minEaVersion: account.minEaVersion,
    maxDevices: account.maxDevices,
    allowSignalSend: account.allowSignalSend,
    allowSignalReceive: account.allowSignalReceive,
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
    header: "Authorization",
    example: `curl -H "Authorization: Bearer ${apiKey}" https://your-domain.com/api/mt5/license/verify`,
  };
}
