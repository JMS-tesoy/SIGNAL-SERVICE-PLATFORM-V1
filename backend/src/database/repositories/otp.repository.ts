import prisma from "../client.js";

export function findUserEmailById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
}

export function findUserPhoneById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true },
  });
}

export function findTotpSetupUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, twoFactorEnabled: true },
  });
}

export function findUserPasswordById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
}

export function findTwoFactorStatusByUserId(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorMethod: true,
      emailVerified: true,
      phone: true,
    },
  });
}
