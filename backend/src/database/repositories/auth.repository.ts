import prisma from "../client.js";

export async function findMt5AccountByApiKeyCandidates(apiKeys: string[]) {
  return prisma.mT5Account.findFirst({
    where: {
      OR: apiKeys.map((apiKey) => ({ apiKey })),
    },
    include: {
      user: {
        select: { id: true, email: true, role: true, status: true },
      },
    },
  });
}

export async function updateMt5AccountApiKey(
  mt5AccountId: string,
  apiKey: string
) {
  return prisma.mT5Account.update({
    where: { id: mt5AccountId },
    data: { apiKey },
  });
}

export async function findAuthUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, role: true, status: true },
  });
}

export async function findUserEmailVerificationById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { emailVerified: true },
  });
}

export async function findActiveSubscriptionByUserId(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: { tier: true },
  });
}
