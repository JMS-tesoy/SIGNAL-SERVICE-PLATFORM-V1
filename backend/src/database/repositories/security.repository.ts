import prisma from "../client.js";

export function findEmailVerificationUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
    },
  });
}

export function activateVerifiedUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" },
  });
}

export function findEmailVerificationStatusByUserId(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      emailVerified: true,
      emailVerifiedAt: true,
    },
  });
}

export function findTwoFactorStatusByUserId(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      twoFactorMethod: true,
    },
  });
}

export function findTotpSetupUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      twoFactorEnabled: true,
    },
  });
}

export function findTotpEnableUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      twoFactorEnabled: true,
      twoFactorSecret: true,
    },
  });
}

export function findEmailTwoFactorUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      twoFactorEnabled: true,
    },
  });
}

export function enableEmailTwoFactor(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
      twoFactorMethod: "EMAIL",
    },
  });
}

export function findTwoFactorDisableUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      password: true,
      twoFactorEnabled: true,
    },
  });
}

export function findActiveSessionsByUserId(userId: string) {
  return prisma.session.findMany({
    where: {
      userId,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      token: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}

export function findSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
  });
}

export function deleteSessionById(sessionId: string) {
  return prisma.session.delete({
    where: { id: sessionId },
  });
}

export function deleteOtherSessionsByUserId(userId: string, currentToken?: string) {
  return prisma.session.deleteMany({
    where: {
      userId,
      token: {
        not: currentToken,
      },
    },
  });
}

export function findNotificationUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}

export function findSecurityActivityUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      lastLoginAt: true,
      lastLoginIp: true,
      emailVerifiedAt: true,
      twoFactorEnabled: true,
      updatedAt: true,
    },
  });
}

export function findRecentSessionsByUserId(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: {
      createdAt: true,
      ipAddress: true,
      userAgent: true,
    },
  });
}
