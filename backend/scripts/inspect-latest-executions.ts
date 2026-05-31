import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const executions = await prisma.signalExecution.findMany({
    take: 10,
    orderBy: {
      receivedAt: 'desc',
    },
    select: {
      id: true,
      signalId: true,
      userId: true,
      mt5AccountId: true,
      status: true,
      errorCode: true,
      errorMessage: true,
      receivedAt: true,
      executedAt: true,
      acknowledgedAt: true,
      signal: {
        select: {
          id: true,
          symbol: true,
          action: true,
          type: true,
          volume: true,
          status: true,
          comment: true,
          expiresAt: true,
          mt5AccountId: true,
        },
      },
    },
  });

  const rows = executions.map((execution) => ({
    executionId: execution.id,
    signalId: execution.signalId,
    signalStatus: execution.signal.status,
    executionStatus: execution.status,
    symbol: execution.signal.symbol,
    action: execution.signal.action,
    type: execution.signal.type,
    executedAt: execution.executedAt?.toISOString() ?? null,
    acknowledgedAt: execution.acknowledgedAt?.toISOString() ?? null,
  }));

  console.table(rows);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
