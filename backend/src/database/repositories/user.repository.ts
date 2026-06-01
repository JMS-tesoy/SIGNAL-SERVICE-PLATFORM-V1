import prisma from "../client.js";
import { getMinEaVersionForAccountType } from "../../utils/mt5-account-policy.js";

type UpdateProfileData = {
  name?: string;
  phone?: string;
  avatar?: string | null;
};

type AddMt5AccountData = {
  accountId: string;
  accountType: "MASTER" | "SLAVE";
  accountEnvironment: "DEMO" | "LIVE";
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
      minEaVersion: getMinEaVersionForAccountType(data.accountType),
    },
  });
}

export function findMt5AccountsByUserId(userId: string) {
  return prisma.mT5Account.findMany({
    where: { userId },
    include: {
      allowedMasterAccount: {
        select: {
          id: true,
          accountId: true,
          accountEnvironment: true,
          broker: true,
          server: true,
          status: true,
        },
      },
      _count: {
        select: {
          allowedFollowers: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

type UpdateMt5AccountApiKeyData = {
  apiKey?: string | null;
  apiKeyPrefix?: string | null;
  apiKeyRevokedAt?: Date | null;
  apiKeyLastUsedAt?: Date | null;
  status?: "ACTIVE" | "BLOCKED" | "REVOKED" | "EXPIRED" | "PENDING";
  minEaVersion?: string;
  maxDevices?: number;
  allowSignalSend?: boolean;
  allowSignalReceive?: boolean;
  isConnected?: boolean;
};

export function updateMt5AccountApiKey(
  accountId: string,
  data: UpdateMt5AccountApiKeyData
) {
  return prisma.mT5Account.update({
    where: { id: accountId },
    data,
  });
}

export function findMt5AccountByIdAndUserId(accountId: string, userId: string) {
  return prisma.mT5Account.findFirst({
    where: { id: accountId, userId },
  });
}

export function assignMt5ReceiverMaster(
  receiverId: string,
  masterAccountId: string
) {
  return prisma.mT5Account.update({
    where: { id: receiverId },
    data: {
      allowedMasterAccountId: masterAccountId,
      allowSignalReceive: true,
    },
    include: {
      allowedMasterAccount: {
        select: {
          id: true,
          accountId: true,
          accountEnvironment: true,
          broker: true,
          server: true,
          status: true,
        },
      },
      _count: {
        select: {
          allowedFollowers: true,
        },
      },
    },
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
