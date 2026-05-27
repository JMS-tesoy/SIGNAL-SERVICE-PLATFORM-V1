import prisma from "../client.js";
import { OTPMethod, OTPType } from "@prisma/client";

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

export function invalidateUnusedOtpTokens(userId: string, type: OTPType) {
  return prisma.oTPToken.updateMany({
    where: {
      userId,
      type,
      usedAt: null,
    },
    data: {
      usedAt: new Date(),
    },
  });
}

export function createOtpToken(input: {
  userId: string;
  code: string;
  type: OTPType;
  method: OTPMethod;
  expiresAt: Date;
}) {
  return prisma.oTPToken.create({
    data: input,
  });
}

export function findLatestValidOtpToken(
  userId: string,
  type: OTPType,
  now = new Date()
) {
  return prisma.oTPToken.findFirst({
    where: {
      userId,
      type,
      usedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

export function markOtpTokenUsed(id: string) {
  return prisma.oTPToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}

export function incrementOtpTokenAttempts(id: string, attempts: number) {
  return prisma.oTPToken.update({
    where: { id },
    data: { attempts },
  });
}

export function markUserEmailVerified(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });
}

export function updateUserTotpSecret(userId: string, secret: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: secret,
      twoFactorMethod: "TOTP",
    },
  });
}

export function findUserTotpSecretById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true },
  });
}

export function enableUserTwoFactor(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
    },
  });
}

export function disableUserTwoFactor(userId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });
}
