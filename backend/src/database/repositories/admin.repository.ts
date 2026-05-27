import prisma from "../client.js";

type UserListFilter = {
  OR?: Array<{
    email?: { contains: string; mode: "insensitive" };
    name?: { contains: string; mode: "insensitive" };
  }>;
};

export function countUsers() {
  return prisma.user.count();
}

export function countActiveSubscriptions() {
  return prisma.subscription.count({ where: { status: "ACTIVE" } });
}

export function countSignals() {
  return prisma.signal.count();
}

export function countSignalsCreatedSince(date: Date) {
  return prisma.signal.count({
    where: {
      createdAt: { gte: date },
    },
  });
}

export function sumSucceededPaymentRevenue() {
  return prisma.payment.aggregate({
    where: { status: "SUCCEEDED" },
    _sum: { amount: true },
  });
}

export function findUsers(filter: UserListFilter, page: number, limit: number) {
  return prisma.user.findMany({
    where: filter,
    select: {
      id: true,
      email: true,
      name: true,
      status: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      lastLoginAt: true,
      subscription: {
        include: { tier: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
}

export function countUsersByFilter(filter: UserListFilter) {
  return prisma.user.count({ where: filter });
}

export function findUserDetailsById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: { include: { tier: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 10 },
      mt5Accounts: true,
      _count: {
        select: {
          sentSignals: true,
          executions: true,
        },
      },
    },
  });
}

export function updateUserStatus(userId: string, status: "ACTIVE" | "SUSPENDED" | "BANNED") {
  return prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, email: true, status: true },
  });
}

export function deleteSessionsByUserId(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}

export function findUserRoleById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
}

export function updateUserRole(userId: string, role: "USER" | "PROVIDER" | "ADMIN") {
  return prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true },
  });
}

export function findSignals(page: number, limit: number) {
  return prisma.signal.findMany({
    include: {
      provider: { select: { email: true, name: true } },
      _count: { select: { executions: true } },
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * limit,
    take: limit,
  });
}

export function findSubscriptionTiers() {
  return prisma.subscriptionTier.findMany({
    orderBy: { sortOrder: "asc" },
  });
}

export function createSubscriptionTier(data: unknown) {
  return prisma.subscriptionTier.create({
    data: data as any,
  });
}

export function updateSubscriptionTier(tierId: string, data: unknown) {
  return prisma.subscriptionTier.update({
    where: { id: tierId },
    data: data as any,
  });
}

export function findSucceededPaymentsSince(startDate: Date) {
  return prisma.payment.findMany({
    where: {
      status: "SUCCEEDED",
      paidAt: { gte: startDate },
    },
    orderBy: { paidAt: "asc" },
  });
}
