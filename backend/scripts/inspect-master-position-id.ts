import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function v(value: any) {
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
      masterTicket: true,
      masterPositionId: true,
      sl: true,
      tp: true,
      createdAt: true,
    },
  });

  console.table(signals.map((s) => ({
    action: s.action,
    symbol: s.symbol,
    type: s.type,
    masterTicket: v(s.masterTicket),
    masterPositionId: v(s.masterPositionId),
    sl: v(s.sl),
    tp: v(s.tp),
    createdAt: s.createdAt.toISOString(),
  })));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
