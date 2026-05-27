import { BillingCycle, SubscriptionStatus } from "@prisma/client";
import prisma from "../../config/database.js";

export function findActiveSubscriptionTiers() {
  return prisma.subscriptionTier.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });
}

export function findSubscriptionWithTierByUserId(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: { tier: true },
  });
}

export function findSubscriptionByUserId(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
  });
}

export function findUserWithSubscription(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });
}

export function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
  });
}

export function findSubscriptionTierById(tierId: string) {
  return prisma.subscriptionTier.findUnique({
    where: { id: tierId },
  });
}

export function upsertUserSubscription(input: {
  userId: string;
  tierId: string;
  billingCycle: BillingCycle;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
}) {
  const {
    userId,
    tierId,
    billingCycle,
    stripeCustomerId,
    stripeSubscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
  } = input;

  return prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tierId,
      billingCycle,
      stripeCustomerId,
      stripeSubscriptionId,
      status: "ACTIVE",
      currentPeriodStart,
      currentPeriodEnd,
    },
    update: {
      tierId,
      billingCycle,
      stripeSubscriptionId,
      status: "ACTIVE",
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
    include: { tier: true },
  });
}

export function updateSubscriptionCancellation(
  userId: string,
  immediately: boolean
) {
  return prisma.subscription.update({
    where: { userId },
    data: {
      status: immediately ? "CANCELED" : "ACTIVE",
      cancelAtPeriodEnd: !immediately,
      canceledAt: new Date(),
    },
    include: { tier: true },
  });
}

export function resumeUserSubscription(userId: string) {
  return prisma.subscription.update({
    where: { userId },
    data: {
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
    include: { tier: true },
  });
}

export function updateUserSubscriptionTier(input: {
  userId: string;
  tierId: string;
  billingCycle: BillingCycle;
}) {
  const { userId, tierId, billingCycle } = input;

  return prisma.subscription.update({
    where: { userId },
    data: {
      tierId,
      billingCycle,
    },
    include: { tier: true },
  });
}

export function findPaymentHistory(userId: string, limit: number) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function countSignalExecutionsSince(userId: string, receivedAfter: Date) {
  return prisma.signalExecution.count({
    where: {
      userId,
      receivedAt: { gte: receivedAfter },
    },
  });
}
