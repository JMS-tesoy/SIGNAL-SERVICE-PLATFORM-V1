import { ExecutionStatus, Prisma, SignalAction, TradeType } from "@prisma/client";
import prisma from "../../config/database.js";

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
