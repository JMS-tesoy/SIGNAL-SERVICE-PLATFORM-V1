import prisma from "../client.js";
import { Prisma } from "@prisma/client";

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

export function findUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export function createUser(data: Prisma.UserCreateInput) {
  return prisma.user.create({
    data,
  });
}

export function findFreeSubscriptionTier() {
  return prisma.subscriptionTier.findFirst({
    where: { name: "free" },
  });
}

export function createFreeSubscriptionForUser(userId: string, tierId: string) {
  return prisma.subscription.create({
    data: {
      userId,
      tierId,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
}

export function createSession(input: {
  userId: string;
  token: string;
  refreshToken?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}) {
  return prisma.session.create({
    data: input,
  });
}

export function updateUserLastLogin(userId: string, ipAddress?: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      lastLoginAt: new Date(),
      lastLoginIp: ipAddress,
    },
  });
}

export function findTwoFactorLoginUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      twoFactorEnabled: true,
      twoFactorMethod: true,
      status: true,
    },
  });
}

export function findSessionByRefreshToken(refreshToken: string) {
  return prisma.session.findUnique({
    where: { refreshToken },
    include: { user: true },
  });
}

export function updateSessionAccessToken(sessionId: string, token: string) {
  return prisma.session.update({
    where: { id: sessionId },
    data: { token },
  });
}

export function deleteSessionsByAccessToken(token: string) {
  return prisma.session.deleteMany({
    where: { token },
  });
}

export function updateUserPassword(userId: string, password: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { password },
  });
}

export function deleteUserSessions(userId: string) {
  return prisma.session.deleteMany({
    where: { userId },
  });
}

export function activateUser(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" },
  });
}
