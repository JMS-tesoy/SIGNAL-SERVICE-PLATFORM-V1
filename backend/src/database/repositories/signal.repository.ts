import { ExecutionStatus, Prisma, SignalAction, SignalStatus, TradeType } from "@prisma/client";
import prisma from "../../config/database.js";

const TERMINAL_EXECUTION_STATUSES: ExecutionStatus[] = [
  "EXECUTED",
  "FAILED",
  "SKIPPED",
  "EXPIRED",
];

export function findMasterAccountByUserAndAccountId(
  userId: string,
  accountId: string
) {
  return prisma.mT5Account.findFirst({
    where: {
      userId,
      accountId,
      accountType: "MASTER",
    },
  });
}

export function findSlaveAccountByUserAndAccountId(
  userId: string,
  accountId: string
) {
  return prisma.mT5Account.findFirst({
    where: {
      userId,
      accountId,
      accountType: "SLAVE",
    },
  });
}

export function markAccountConnected(mt5AccountId: string) {
  return prisma.mT5Account.update({
    where: { id: mt5AccountId },
    data: {
      isConnected: true,
      lastHeartbeat: new Date(),
    },
  });
}

export function findAccountByUserAndAccountId(userId: string, accountId: string) {
  return prisma.mT5Account.findFirst({
    where: { userId, accountId },
  });
}

export function updateAccountHeartbeat(
  mt5AccountId: string,
  data: { balance?: number; equity?: number; profit?: number }
) {
  return prisma.mT5Account.update({
    where: { id: mt5AccountId },
    data: {
      isConnected: true,
      lastHeartbeat: new Date(),
      balance: data.balance,
      equity: data.equity,
      profit: data.profit,
    },
  });
}

export function findLatestAccountSnapshot(mt5AccountId: string) {
  return prisma.accountSnapshot.findFirst({
    where: { mt5AccountId },
    orderBy: { snapshotDate: "desc" },
  });
}

export function upsertDailyAccountSnapshot(input: {
  mt5AccountId: string;
  balance: number;
  equity: number;
  profit: number;
  peakEquity: number;
  snapshotDate: Date;
}) {
  const { mt5AccountId, balance, equity, profit, peakEquity, snapshotDate } =
    input;

  return prisma.accountSnapshot.upsert({
    where: {
      mt5AccountId_snapshotDate: {
        mt5AccountId,
        snapshotDate,
      },
    },
    create: {
      mt5AccountId,
      balance,
      equity,
      profit,
      peakEquity,
      snapshotDate,
    },
    update: {
      balance,
      equity,
      profit,
      peakEquity,
    },
  });
}

export function findSignalHistory(input: {
  where: Prisma.SignalWhereInput;
  userId: string;
  offset: number;
  limit: number;
}) {
  const { where, userId, offset, limit } = input;

  return Promise.all([
    prisma.signal.findMany({
      where,
      include: {
        executions: { where: { userId } },
        provider: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    }),
    prisma.signal.count({ where }),
  ]);
}

export function findExecutionsForStatistics(userId: string, startDate: Date) {
  return prisma.signalExecution.findMany({
    where: { userId, receivedAt: { gte: startDate } },
    include: { signal: true },
  });
}

export function findUserMt5AccountIds(userId: string) {
  return prisma.mT5Account.findMany({
    where: { userId },
    select: { id: true },
  });
}

export function findAccountSnapshotsFromDate(
  mt5AccountIds: string[],
  startDate: Date
) {
  return prisma.accountSnapshot.findMany({
    where: {
      mt5AccountId: { in: mt5AccountIds },
      snapshotDate: { gte: startDate },
    },
    orderBy: { snapshotDate: "asc" },
  });
}

export function findInitialAccountSnapshot(mt5AccountIds: string[]) {
  return prisma.accountSnapshot.findFirst({
    where: { mt5AccountId: { in: mt5AccountIds } },
    orderBy: { snapshotDate: "asc" },
  });
}

export async function expirePendingSignals(now = new Date()) {
  const result = await prisma.signal.updateMany({
    where: {
      status: { in: ["PENDING", "ACTIVE"] },
      expiresAt: { lt: now },
    },
    data: { status: "EXPIRED" },
  });

  await prisma.signalExecution.updateMany({
    where: { status: "PENDING", signal: { status: "EXPIRED" } },
    data: { status: "EXPIRED" },
  });

  return result.count;
}

export function createSignal(data: {
  providerId: string;
  mt5AccountId: string;
  action: SignalAction;
  symbol: string;
  type: TradeType;
  volume: number;
  price: number;
  sl: number | null;
  tp: number | null;
  masterTicket: bigint | null;
  magic: number | null;
  comment: string | null;
  expiresAt: Date;
}) {
  return prisma.signal.create({
    data: {
      ...data,
      status: "PENDING",
    },
  });
}

export function findSignalByMasterTicket(input: {
  providerId: string;
  mt5AccountId: string;
  masterTicket: bigint;
}) {
  return prisma.signal.findFirst({
    where: {
      providerId: input.providerId,
      mt5AccountId: input.mt5AccountId,
      masterTicket: input.masterTicket,
    },
    orderBy: { createdAt: "asc" },
  });
}

export function findSignalByMasterTicketAndAction(input: {
  providerId: string;
  mt5AccountId: string;
  masterTicket: bigint;
  action: SignalAction;
}) {
  return prisma.signal.findFirst({
    where: {
      providerId: input.providerId,
      mt5AccountId: input.mt5AccountId,
      masterTicket: input.masterTicket,
      action: input.action,
    },
    orderBy: { createdAt: "asc" },
  });
}

export function findLatestModifySignalByMasterTicket(input: {
  providerId: string;
  mt5AccountId: string;
  masterTicket: bigint;
}) {
  return prisma.signal.findFirst({
    where: {
      providerId: input.providerId,
      mt5AccountId: input.mt5AccountId,
      masterTicket: input.masterTicket,
      action: "MODIFY",
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      sl: true,
      tp: true,
    },
  });
}

export async function reconcileSignalStatusFromExecutions(signalId: string) {
  const executions = await prisma.signalExecution.findMany({
    where: { signalId },
    select: { status: true },
  });

  if (executions.length === 0) {
    return null;
  }

  const allTerminal = executions.every((execution) =>
    TERMINAL_EXECUTION_STATUSES.includes(execution.status)
  );

  if (!allTerminal) {
    return null;
  }

  const hasExecuted = executions.some((execution) => execution.status === "EXECUTED");
  const nextStatus: SignalStatus = hasExecuted ? "EXECUTED" : "EXPIRED";
  const replaceableStatuses: SignalStatus[] =
    nextStatus === "EXECUTED" ? ["PENDING", "ACTIVE", "EXPIRED"] : ["PENDING", "ACTIVE"];

  await prisma.signal.updateMany({
    where: {
      id: signalId,
      status: { in: replaceableStatuses },
    },
    data: { status: nextStatus },
  });

  return nextStatus;
}

export function findUserSubscriptionWithTier(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: { tier: true },
  });
}

export function findPendingExecutionsForSlaveAccount(
  userId: string,
  mt5AccountId: string,
  delayedTime: Date
) {
  return prisma.signalExecution.findMany({
    where: {
      userId,
      mt5AccountId,
      status: "PENDING",
      signal: {
        status: { in: ["PENDING", "ACTIVE"] },
        expiresAt: { gt: new Date() },
        createdAt: { lte: delayedTime },
      },
    },
    include: { signal: true },
    orderBy: { receivedAt: "asc" },
    take: 10,
  });
}

export function findExecutionByIdForUser(
  executionId: string,
  userId: string,
  mt5AccountId?: string
) {
  return prisma.signalExecution.findFirst({
    where: {
      id: executionId,
      userId,
      ...(mt5AccountId ? { mt5AccountId } : {}),
    },
  });
}

export function acknowledgePendingExecution(input: {
  executionId: string;
  userId: string;
  status: ExecutionStatus;
  details?: {
    executedVolume?: number;
    executedPrice?: number;
    slippage?: number;
    slaveTicket?: number;
    errorCode?: number;
    errorMessage?: string | null;
  };
  mt5AccountId?: string;
}) {
  const { executionId, userId, status, details, mt5AccountId } = input;

  return prisma.signalExecution.updateMany({
    where: {
      id: executionId,
      userId,
      ...(mt5AccountId ? { mt5AccountId } : {}),
      status: "PENDING",
    },
    data: {
      status,
      executedAt: status === "EXECUTED" ? new Date() : null,
      acknowledgedAt: new Date(),
      executedVolume: details?.executedVolume,
      executedPrice: details?.executedPrice,
      slippage: details?.slippage,
      slaveTicket: details?.slaveTicket ? BigInt(details.slaveTicket) : null,
      errorCode: details?.errorCode,
      errorMessage: details?.errorMessage,
    },
  });
}

export function findExecutionStatusByIdForUser(
  executionId: string,
  userId: string,
  mt5AccountId?: string
) {
  return prisma.signalExecution.findFirst({
    where: {
      id: executionId,
      userId,
      ...(mt5AccountId ? { mt5AccountId } : {}),
    },
    select: { status: true },
  });
}

export async function createPendingExecutionsForActiveSubscriberSlaveAccounts(
  signalId: string
) {
  const subscribers = await prisma.subscription.findMany({
    where: {
      status: "ACTIVE",
      user: {
        status: "ACTIVE",
        // Provider exclusion removed for testing - admin can receive own signals.
        mt5Accounts: { some: { accountType: "SLAVE" } },
      },
    },
    include: {
      user: {
        include: {
          mt5Accounts: { where: { accountType: "SLAVE" } },
        },
      },
      tier: true,
    },
  });

  const executions: Prisma.SignalExecutionCreateManyInput[] =
    subscribers.flatMap((sub) =>
      sub.user.mt5Accounts.map((account) => ({
        signalId,
        userId: sub.user.id,
        mt5AccountId: account.id,
        status: "PENDING" as ExecutionStatus,
      }))
    );

  if (executions.length === 0) {
    return;
  }

  await prisma.signalExecution.createMany({
    data: executions,
    skipDuplicates: true,
  });
}
