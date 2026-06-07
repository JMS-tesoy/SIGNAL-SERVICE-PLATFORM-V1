type Mt5AccountForResponse = {
  id: string;
  accountId: string;
  accountType: string;
  accountEnvironment: string;
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
  allowedMasterAccountId: string | null;
  allowedMasterAccount?: {
    id: string;
    accountId: string;
    accountEnvironment: string;
    broker: string | null;
    server: string | null;
    status: string;
  } | null;
  _count?: {
    allowedFollowers: number;
  };
  balance: unknown;
  equity: unknown;
  profit: unknown;
  realizedProfit: unknown;
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
    accountEnvironment: account.accountEnvironment,
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
    allowedMasterAccountId: account.allowedMasterAccountId,
    assignedMaster: account.allowedMasterAccount
      ? {
          id: account.allowedMasterAccount.id,
          accountId: account.allowedMasterAccount.accountId,
          accountEnvironment: account.allowedMasterAccount.accountEnvironment,
          broker: account.allowedMasterAccount.broker,
          server: account.allowedMasterAccount.server,
          status: account.allowedMasterAccount.status,
        }
      : null,
    followersAssigned: account._count?.allowedFollowers ?? 0,
    balance: decimalToNullableNumber(account.balance),
    equity: decimalToNullableNumber(account.equity),
    profit: decimalToNullableNumber(account.profit),
    floatingProfit: decimalToNullableNumber(account.profit),
    realizedProfit: decimalToNullableNumber(account.realizedProfit),
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
