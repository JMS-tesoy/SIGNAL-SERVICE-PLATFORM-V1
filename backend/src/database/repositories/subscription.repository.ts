import { BillingCycle, PaymentStatus, SubscriptionStatus } from "@prisma/client";
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

export function findFreeSubscriptionTier() {
  return prisma.subscriptionTier.findFirst({
    where: { name: "free" },
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

export function upsertCheckoutSubscription(input: {
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
      stripeCustomerId,
      stripeSubscriptionId,
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  });
}

export function findSubscriptionByStripeSubscriptionId(
  stripeSubscriptionId: string
) {
  return prisma.subscription.findFirst({
    where: { stripeSubscriptionId },
  });
}

export function updateStripeSubscriptionPeriod(input: {
  id: string;
  status: SubscriptionStatus;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}) {
  const {
    id,
    status,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd,
  } = input;

  return prisma.subscription.update({
    where: { id },
    data: {
      status,
      currentPeriodStart,
      currentPeriodEnd,
      cancelAtPeriodEnd,
    },
  });
}

export function downgradeSubscriptionToFreeTier(
  subscriptionId: string,
  tierId: string
) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      tierId,
      status: "ACTIVE",
      stripeSubscriptionId: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  });
}

export function markSubscriptionCanceled(subscriptionId: string) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: {
      status: "CANCELED",
    },
  });
}

export function findPaymentByStripeInvoiceId(
  stripeInvoiceId: string,
  status?: PaymentStatus
) {
  return prisma.payment.findFirst({
    where: {
      stripeInvoiceId,
      ...(status ? { status } : {}),
    },
  });
}

export function findSubscriptionByStripeCustomerIdWithUser(
  stripeCustomerId: string
) {
  return prisma.subscription.findFirst({
    where: { stripeCustomerId },
    include: { user: true },
  });
}

export function createPayment(input: {
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripePaymentId?: string;
  stripeInvoiceId: string;
  description: string;
  paidAt?: Date;
  failedAt?: Date;
}) {
  return prisma.payment.create({
    data: input,
  });
}

export function updateSubscriptionStatus(
  subscriptionId: string,
  status: SubscriptionStatus
) {
  return prisma.subscription.update({
    where: { id: subscriptionId },
    data: { status },
  });
}
