import prisma from "../client.js";

type UpdateProfileData = {
  name?: string;
  phone?: string;
  avatar?: string | null;
};

type AddMt5AccountData = {
  accountId: string;
  accountType: "MASTER" | "SLAVE";
  broker?: string;
  server: string;
};

export function findUserProfileById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
      emailVerified: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
      subscription: {
        include: { tier: true },
      },
      mt5Accounts: {
        select: {
          id: true,
          accountId: true,
          accountType: true,
          broker: true,
          isConnected: true,
          lastHeartbeat: true,
          balance: true,
          equity: true,
        },
      },
    },
  });
}

export function updateUserProfile(userId: string, data: UpdateProfileData) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      avatar: true,
    },
  });
}

export function findUserPasswordById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });
}

export function updateUserPassword(userId: string, hashedPassword: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
    select: { email: true, name: true },
  });
}

export function deleteOtherUserSessions(userId: string, currentToken?: string) {
  return prisma.session.deleteMany({
    where: {
      userId,
      ...(currentToken ? { token: { not: currentToken } } : {}),
    },
  });
}

export function findSubscriptionWithTierByUserId(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: { tier: true },
  });
}

export function countSlaveAccountsByUserId(userId: string) {
  return prisma.mT5Account.count({
    where: { userId, accountType: "SLAVE" },
  });
}

export function createMt5Account(userId: string, data: AddMt5AccountData) {
  return prisma.mT5Account.create({
    data: {
      userId,
      ...data,
    },
  });
}

export function findMt5AccountsByUserId(userId: string) {
  return prisma.mT5Account.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export function updateMt5AccountApiKey(accountId: string, apiKey: string | null) {
  return prisma.mT5Account.update({
    where: { id: accountId },
    data: { apiKey },
  });
}

export function findMt5AccountByIdAndUserId(accountId: string, userId: string) {
  return prisma.mT5Account.findFirst({
    where: { id: accountId, userId },
  });
}

export function deleteMt5AccountById(accountId: string) {
  return prisma.mT5Account.delete({
    where: { id: accountId },
  });
}

export function findUserSessions(userId: string) {
  return prisma.session.findMany({
    where: { userId },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export function findNotificationRecipientsByIds(userIds: string[]) {
  return prisma.user.findMany({
    where: {
      id: { in: userIds },
    },
    select: {
      id: true,
      email: true,
      name: true,
    },
  });
}

export function deleteUserSession(sessionId: string, userId: string) {
  return prisma.session.deleteMany({
    where: { id: sessionId, userId },
  });
}
