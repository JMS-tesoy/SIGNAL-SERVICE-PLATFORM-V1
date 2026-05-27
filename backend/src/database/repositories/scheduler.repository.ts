import { Prisma } from "@prisma/client";
import prisma from "../client.js";

export function findExpiringCancelableSubscriptions(threeDaysFromNow: Date) {
  return prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: {
        gte: new Date(),
        lte: threeDaysFromNow,
      },
    },
    include: { user: true, tier: true },
  });
}

export function findExpiredCancelableSubscriptions(now = new Date()) {
  return prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: { lt: now },
      cancelAtPeriodEnd: true,
    },
  });
}

export function findFreeSubscriptionTier() {
  return prisma.subscriptionTier.findFirst({ where: { name: "free" } });
}

export function downgradeExpiredSubscriptionToFree(input: {
  subscriptionId: string;
  tierId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}) {
  const { subscriptionId, tierId, currentPeriodStart, currentPeriodEnd } =
    input;

  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      tierId,
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      canceledAt: null,
      currentPeriodStart,
      currentPeriodEnd,
    },
  });
}

export function findActiveUsersWithSubscriptionTier() {
  return prisma.user.findMany({
    where: { status: "ACTIVE" },
    include: { subscription: { include: { tier: true } } },
  });
}

export function findMonthlyReport(
  userId: string,
  year: number,
  month: number
) {
  return prisma.monthlyReport.findUnique({
    where: {
      userId_year_month: {
        userId,
        year,
        month,
      },
    },
  });
}

export function findSignalExecutionsForUserPeriod(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.signalExecution.findMany({
    where: {
      userId,
      receivedAt: { gte: startDate, lte: endDate },
    },
    include: { signal: true },
  });
}

export function findLatestMt5AccountByUserId(userId: string) {
  return prisma.mT5Account.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
}

export function upsertMonthlyReport(input: {
  userId: string;
  year: number;
  month: number;
  totalSignals: number;
  executedSignals: number;
  winningTrades: number;
  losingTrades: number;
  endBalance?: Prisma.Decimal | number | string | null;
  endEquity?: Prisma.Decimal | number | string | null;
  subscriptionTier?: string | null;
}) {
  const {
    userId,
    year,
    month,
    totalSignals,
    executedSignals,
    winningTrades,
    losingTrades,
    endBalance,
    endEquity,
    subscriptionTier,
  } = input;

  return prisma.monthlyReport.upsert({
    where: {
      userId_year_month: {
        userId,
        year,
        month,
      },
    },
    create: {
      userId,
      year,
      month,
      totalSignals,
      executedSignals,
      winningTrades,
      losingTrades,
      totalProfit: 0,
      totalLoss: 0,
      netProfit: 0,
      endBalance,
      endEquity,
      subscriptionTier,
    },
    update: {
      totalSignals,
      executedSignals,
      winningTrades,
      losingTrades,
      endBalance,
      endEquity,
    },
  });
}

export function findDisconnectedAccounts(before: Date) {
  return prisma.mT5Account.findMany({
    where: { isConnected: true, lastHeartbeat: { lt: before } },
    include: { user: true },
  });
}

export function markMt5AccountDisconnected(accountId: string) {
  return prisma.mT5Account.update({
    where: { id: accountId },
    data: { isConnected: false },
  });
}

export function markStaleConnectedAccountsDisconnected(before: Date) {
  return prisma.mT5Account.updateMany({
    where: { isConnected: true, lastHeartbeat: { lt: before } },
    data: { isConnected: false },
  });
}

export function deleteExpiredSessions(now = new Date()) {
  return prisma.session.deleteMany({
    where: { expiresAt: { lt: now } },
  });
}

export function deleteExpiredOtpTokens(now = new Date(), olderThan: Date) {
  return prisma.oTPToken.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: now } }, { createdAt: { lt: olderThan } }],
    },
  });
}
