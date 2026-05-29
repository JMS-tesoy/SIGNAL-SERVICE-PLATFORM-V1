import type { MT5Account, MT5EaType, Subscription, SubscriptionTier } from "@prisma/client";
import prisma from "../config/database.js";
import { hashMt5ApiKey } from "../utils/api-key.js";
import type {
  Mt5HeartbeatInput,
  Mt5LicenseVerifyInput,
  Mt5SignalsPullInput,
  Mt5TradeReportInput,
} from "../routes/schemas/mt5.schemas.js";

type SubscriptionWithTier = Subscription & {
  tier: SubscriptionTier;
};

type Mt5AuthContext = {
  mt5Account: MT5Account;
  subscription: SubscriptionWithTier | null;
};

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["ACTIVE", "TRIALING"]);
const STALE_SESSION_MS = 2 * 60 * 1000;

function isSessionStale(lastHeartbeatAt: Date | null | undefined, now = new Date()) {
  if (!lastHeartbeatAt) {
    return true;
  }

  return now.getTime() - lastHeartbeatAt.getTime() > STALE_SESSION_MS;
}

async function markSessionStale(sessionId: string) {
  await prisma.mT5LicenseSession.update({
    where: { id: sessionId },
    data: {
      status: "STALE",
      lastSeenAt: new Date(),
    },
  });
}

function normalizeOptional(value: string | null | undefined) {
  return value?.trim() || null;
}

function blocked(code: string, message: string) {
  return {
    allowed: false,
    code,
    message,
  };
}

function compareVersion(current: string, minimum: string) {
  const currentParts = current.split(".").map((part) => Number(part) || 0);
  const minimumParts = minimum.split(".").map((part) => Number(part) || 0);
  const maxLength = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < maxLength; index += 1) {
    const currentValue = currentParts[index] ?? 0;
    const minimumValue = minimumParts[index] ?? 0;

    if (currentValue > minimumValue) return 1;
    if (currentValue < minimumValue) return -1;
  }

  return 0;
}

async function authenticateApiKey(rawApiKey: string): Promise<Mt5AuthContext | null> {
  const keyHash = hashMt5ApiKey(rawApiKey);

  const mt5Account = await prisma.mT5Account.findUnique({
    where: { apiKey: keyHash },
  });

  if (!mt5Account) {
    return null;
  }

  await prisma.mT5Account.update({
    where: { id: mt5Account.id },
    data: { apiKeyLastUsedAt: new Date() },
  });

  const subscription = await prisma.subscription.findUnique({
    where: { userId: mt5Account.userId },
    include: { tier: true },
  });

  return {
    mt5Account,
    subscription,
  };
}

function validateBaseAccount(
  context: Mt5AuthContext,
  input: {
    accountId: string;
    broker?: string;
    server: string;
    eaVersion: string;
  }
) {
  const { mt5Account, subscription } = context;

  if (mt5Account.apiKeyRevokedAt) {
    return blocked("BLOCK_KEY_REVOKED", "API key has been revoked");
  }

  if (mt5Account.status !== "ACTIVE") {
    return blocked("BLOCK_ACCOUNT_DISABLED", "MT5 account is not active");
  }

  if (!subscription || !ACTIVE_SUBSCRIPTION_STATUSES.has(subscription.status)) {
    return blocked("BLOCK_SUBSCRIPTION_EXPIRED", "Subscription is not active");
  }

  if (mt5Account.accountId !== input.accountId) {
    return blocked("BLOCK_ACCOUNT_MISMATCH", "MT5 account does not match registered license");
  }

  const registeredBroker = normalizeOptional(mt5Account.broker);
  const incomingBroker = normalizeOptional(input.broker);

  if (registeredBroker && incomingBroker && registeredBroker !== incomingBroker) {
    return blocked("BLOCK_SERVER_MISMATCH", "Broker does not match registered license");
  }

  if (normalizeOptional(mt5Account.server) !== normalizeOptional(input.server)) {
    return blocked("BLOCK_SERVER_MISMATCH", "Server does not match registered license");
  }

  if (compareVersion(input.eaVersion, mt5Account.minEaVersion) < 0) {
    return blocked("BLOCK_OLD_EA_VERSION", "Please update your EA to continue");
  }

  return null;
}

function validateEaPermission(mt5Account: MT5Account, eaType: MT5EaType) {
  if (eaType === "SENDER") {
    if (mt5Account.accountType !== "MASTER" || !mt5Account.allowSignalSend) {
      return blocked("BLOCK_EA_TYPE_NOT_ALLOWED", "Sender EA is not allowed for this account");
    }
  }

  if (eaType === "RECEIVER") {
    if (mt5Account.accountType !== "SLAVE" || !mt5Account.allowSignalReceive) {
      return blocked("BLOCK_EA_TYPE_NOT_ALLOWED", "Receiver EA is not allowed for this account");
    }
  }

  return null;
}

export async function verifyMt5License(rawApiKey: string | null, input: Mt5LicenseVerifyInput) {
  if (!rawApiKey) {
    return blocked("BLOCK_INVALID_KEY", "Missing API key");
  }

  const context = await authenticateApiKey(rawApiKey);

  if (!context) {
    return blocked("BLOCK_INVALID_KEY", "Invalid API key");
  }

  const baseError = validateBaseAccount(context, input);
  if (baseError) return baseError;

  const permissionError = validateEaPermission(context.mt5Account, input.eaType);
  if (permissionError) return permissionError;

  const now = new Date();
  const activeSessions = await prisma.mT5LicenseSession.findMany({
    where: {
      mt5AccountId: context.mt5Account.id,
      eaType: input.eaType,
      status: "ACTIVE",
      lastHeartbeatAt: {
        gte: new Date(now.getTime() - STALE_SESSION_MS),
      },
      terminalFingerprint: {
        not: input.terminalFingerprint,
      },
    },
  });

  if (activeSessions.length >= context.mt5Account.maxDevices) {
    return blocked("BLOCK_DUPLICATE_DEVICE", "Device/session limit reached");
  }

  const session = await prisma.mT5LicenseSession.upsert({
    where: {
      mt5AccountId_eaType_terminalFingerprint: {
        mt5AccountId: context.mt5Account.id,
        eaType: input.eaType,
        terminalFingerprint: input.terminalFingerprint,
      },
    },
    create: {
      userId: context.mt5Account.userId,
      mt5AccountId: context.mt5Account.id,
      accountId: input.accountId,
      broker: input.broker,
      server: input.server,
      terminalFingerprint: input.terminalFingerprint,
      deviceId: input.deviceId,
      terminalId: input.terminalId,
      eaType: input.eaType,
      eaVersion: input.eaVersion,
      status: "ACTIVE",
      lastSeenAt: now,
      lastHeartbeatAt: now,
    },
    update: {
      broker: input.broker,
      server: input.server,
      deviceId: input.deviceId,
      terminalId: input.terminalId,
      eaVersion: input.eaVersion,
      status: "ACTIVE",
      lastSeenAt: now,
      lastHeartbeatAt: now,
    },
  });

  await prisma.mT5Account.update({
    where: { id: context.mt5Account.id },
    data: {
      isConnected: true,
      lastHeartbeat: now,
    },
  });

  return {
    allowed: true,
    code: "ALLOW",
    licenseStatus: context.mt5Account.status,
    sessionId: session.id,
    heartbeatIntervalSeconds: 30,
    message: "License verified",
  };
}

export async function recordMt5Heartbeat(rawApiKey: string | null, input: Mt5HeartbeatInput) {
  if (!rawApiKey) {
    return { ...blocked("BLOCK_INVALID_KEY", "Missing API key"), ok: false, continue: false };
  }

  const context = await authenticateApiKey(rawApiKey);

  if (!context) {
    return { ...blocked("BLOCK_INVALID_KEY", "Invalid API key"), ok: false, continue: false };
  }

  const baseError = validateBaseAccount(context, input);
  if (baseError) return { ...baseError, ok: false, continue: false };

  const session = await prisma.mT5LicenseSession.findFirst({
    where: {
      id: input.sessionId,
      mt5AccountId: context.mt5Account.id,
      terminalFingerprint: input.terminalFingerprint,
    },
  });

  if (!session) {
    return { ...blocked("BLOCK_SESSION_REVOKED", "Session is invalid"), ok: false, continue: false };
  }

  if (session.status === "REVOKED" || session.status === "BLOCKED") {
    return { ...blocked("BLOCK_SESSION_REVOKED", "Session is blocked"), ok: false, continue: false };
  }

  const now = new Date();

  await prisma.mT5LicenseSession.update({
    where: { id: session.id },
    data: {
      eaVersion: input.eaVersion,
      deviceId: input.deviceId,
      terminalId: input.terminalId,
      status: "ACTIVE",
      lastSeenAt: now,
      lastHeartbeatAt: now,
    },
  });

  await prisma.mT5Account.update({
    where: { id: context.mt5Account.id },
    data: {
      isConnected: true,
      lastHeartbeat: now,
      balance: input.balance,
      equity: input.equity,
      profit: input.profit,
    },
  });

  return {
    allowed: true,
    ok: true,
    continue: true,
    sessionStatus: "ACTIVE",
    serverTime: now.toISOString(),
  };
}

export async function pullMt5Signals(rawApiKey: string | null, input: Mt5SignalsPullInput) {
  if (!rawApiKey) {
    return { ...blocked("BLOCK_INVALID_KEY", "Missing API key"), signals: [] };
  }

  const context = await authenticateApiKey(rawApiKey);

  if (!context) {
    return { ...blocked("BLOCK_INVALID_KEY", "Invalid API key"), signals: [] };
  }

  const baseError = validateBaseAccount(context, input);
  if (baseError) return { ...baseError, signals: [] };

  const permissionError = validateEaPermission(context.mt5Account, "RECEIVER");
  if (permissionError) return { ...permissionError, signals: [] };

  const session = await prisma.mT5LicenseSession.findFirst({
    where: {
      id: input.sessionId,
      mt5AccountId: context.mt5Account.id,
      terminalFingerprint: input.terminalFingerprint,
      eaType: "RECEIVER",
      status: "ACTIVE",
    },
  });

   if (!session) {
    return { ...blocked("BLOCK_SESSION_REVOKED", "Session is invalid"), signals: [] };
  }

  if (isSessionStale(session.lastHeartbeatAt)) {
    await markSessionStale(session.id);

    await prisma.mT5Account.update({
      where: { id: context.mt5Account.id },
      data: {
        isConnected: false,
      },
    });

    return { ...blocked("BLOCK_SESSION_STALE", "Session is stale"), signals: [] };
  }

  const executions = await prisma.signalExecution.findMany({
    where: {
      userId: context.mt5Account.userId,
      mt5AccountId: context.mt5Account.id,
      status: "PENDING",
      signal: {
        status: { in: ["PENDING", "ACTIVE"] },
        expiresAt: { gt: new Date() },
        ...(context.mt5Account.allowedMasterAccountId
          ? { mt5AccountId: context.mt5Account.allowedMasterAccountId }
          : {}),
      },
    },
    include: { signal: true },
    orderBy: { receivedAt: "asc" },
    take: 10,
  });

  return {
    allowed: true,
    signals: executions.map((execution) => ({
      executionId: execution.id,
      signalId: execution.signalId,
      masterAccountId: execution.signal.mt5AccountId,
      symbol: execution.signal.symbol,
      action: execution.signal.action,
      orderType: execution.signal.type,
      lotSize: Number(execution.signal.volume),
      entryPrice: Number(execution.signal.price),
      sl: execution.signal.sl ? Number(execution.signal.sl) : null,
      tp: execution.signal.tp ? Number(execution.signal.tp) : null,
      expiresAt: execution.signal.expiresAt.toISOString(),
    })),
  };
}

export async function reportMt5Trade(rawApiKey: string | null, input: Mt5TradeReportInput) {
  if (!rawApiKey) {
    return { ...blocked("BLOCK_INVALID_KEY", "Missing API key"), ok: false };
  }

  const context = await authenticateApiKey(rawApiKey);

  if (!context) {
    return { ...blocked("BLOCK_INVALID_KEY", "Invalid API key"), ok: false };
  }

   const session = await prisma.mT5LicenseSession.findFirst({
    where: {
      id: input.sessionId,
      mt5AccountId: context.mt5Account.id,
      terminalFingerprint: input.terminalFingerprint,
      eaType: "RECEIVER",
    },
  });

     if (!session) {
    return { ...blocked("BLOCK_SESSION_REVOKED", "Session is invalid"), ok: false };
  }

  if (session.status === "REVOKED" || session.status === "BLOCKED") {
    return { ...blocked("BLOCK_SESSION_REVOKED", "Session is blocked"), ok: false };
  }

  if (session.status === "STALE" || isSessionStale(session.lastHeartbeatAt)) {
    await markSessionStale(session.id);

    await prisma.mT5Account.update({
      where: { id: context.mt5Account.id },
      data: {
        isConnected: false,
      },
    });

    return { ...blocked("BLOCK_SESSION_STALE", "Session is stale"), ok: false };
  }

  const baseError = validateBaseAccount(context, {
    accountId: input.accountId,
    broker: input.broker,
    server: input.server,
    eaVersion: session.eaVersion,
  });

  if (baseError) return { ...baseError, ok: false };

  const permissionError = validateEaPermission(context.mt5Account, "RECEIVER");
  if (permissionError) return { ...permissionError, ok: false };

    const executionStatus = input.status === "FAILED" ? "FAILED" : "EXECUTED";

  const matchingExecution = await prisma.signalExecution.findFirst({
    where: {
      signalId: input.signalId,
      userId: context.mt5Account.userId,
      mt5AccountId: context.mt5Account.id,
      status: "PENDING",
      signal: {
        status: { in: ["PENDING", "ACTIVE"] },
        expiresAt: { gt: new Date() },
        ...(context.mt5Account.allowedMasterAccountId
          ? { mt5AccountId: context.mt5Account.allowedMasterAccountId }
          : {}),
      },
    },
  });

  if (!matchingExecution) {
    return {
      ok: false,
      allowed: false,
      code: "BLOCK_SIGNAL_NOT_ALLOWED",
      message: "Signal is not assigned to this follower account",
    };
  }

  await prisma.signalExecution.update({
    where: {
      id: matchingExecution.id,
    },
    data: {
      status: executionStatus,
      executedAt: executionStatus === "EXECUTED" ? new Date() : null,
      acknowledgedAt: new Date(),
      executedVolume: input.lotSize,
      executedPrice: input.openPrice ?? undefined,
      slaveTicket: input.ticket ? BigInt(input.ticket) : undefined,
      errorCode:
        typeof input.errorCode === "number"
          ? input.errorCode
          : input.errorCode
            ? Number(input.errorCode)
            : undefined,
      errorMessage: input.errorMessage ?? undefined,
    },
  });

    return {
    ok: true,
    message: "Trade report received",
  };
}