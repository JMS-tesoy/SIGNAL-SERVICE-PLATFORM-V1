import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const signals = await prisma.signal.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      action: true,
      symbol: true,
      type: true,
      volume: true,
      price: true,
      sl: true,
      tp: true,
      status: true,
      createdAt: true,
      mt5AccountId: true,
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

  console.dir(signals, { depth: null });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
