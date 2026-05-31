import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function toText(value: any) {
  if (value === null || value === undefined) return null;
  return value.toString();
}

async function main() {
  const signals = await prisma.signal.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      action: true,
      symbol: true,
      type: true,
      price: true,
      sl: true,
      tp: true,
      status: true,
      createdAt: true,
      executions: {
        select: {
          id: true,
          status: true,
          errorCode: true,
          errorMessage: true,
          executedAt: true,
          acknowledgedAt: true,
        },
      },
    },
  });

  console.table(
    signals.map((signal) => ({
      id: signal.id,
      action: signal.action,
      symbol: signal.symbol,
      type: signal.type,
      price: toText(signal.price),
      sl: toText(signal.sl),
      tp: toText(signal.tp),
      status: signal.status,
      createdAt: signal.createdAt.toISOString(),
      executionStatus: signal.executions[0]?.status ?? null,
      executionError: signal.executions[0]?.errorMessage ?? null,
      executedAt: signal.executions[0]?.executedAt?.toISOString() ?? null,
    }))
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
