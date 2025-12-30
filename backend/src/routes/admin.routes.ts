// =============================================================================
// ADMIN ROUTES
// =============================================================================

import { Router, Request, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import prisma from '../config/database.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireAdmin);

// =============================================================================
// DASHBOARD STATS
// =============================================================================

router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  const [
    totalUsers,
    activeSubscriptions,
    totalSignals,
    todaySignals,
    revenue,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.subscription.count({ where: { status: 'ACTIVE' } }),
    prisma.signal.count(),
    prisma.signal.count({
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
    }),
    prisma.payment.aggregate({
      where: { status: 'SUCCEEDED' },
      _sum: { amount: true },
    }),
  ]);

  res.json({
    totalUsers,
    activeSubscriptions,
    totalSignals,
    todaySignals,
    totalRevenue: revenue._sum.amount ? Number(revenue._sum.amount) : 0,
  });
}));

// =============================================================================
// LIST USERS
// =============================================================================

router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const search = req.query.search as string;

  const where: any = {};
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  res.json({
    users,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}));

// =============================================================================
// GET USER DETAILS
// =============================================================================

router.get('/users/:userId', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: { include: { tier: true } },
      payments: { orderBy: { createdAt: 'desc' }, take: 10 },
      mt5Accounts: true,
      _count: {
        select: {
          sentSignals: true,
          executions: true,
        },
      },
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user });
}));

// =============================================================================
// UPDATE USER STATUS
// =============================================================================

router.patch('/users/:userId/status', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'SUSPENDED', 'BANNED'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { status },
    select: { id: true, email: true, status: true },
  });

  // If banning/suspending, invalidate all sessions
  if (status !== 'ACTIVE') {
    await prisma.session.deleteMany({ where: { userId } });
  }

  res.json({ user, message: `User status updated to ${status}` });
}));

// =============================================================================
// UPDATE USER ROLE
// =============================================================================

router.patch('/users/:userId/role', asyncHandler(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!['USER', 'PROVIDER', 'ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Prevent changing super admin role
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (targetUser?.role === 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Cannot modify super admin role' });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { role },
    select: { id: true, email: true, role: true },
  });

  res.json({ user, message: `User role updated to ${role}` });
}));

// =============================================================================
// LIST SIGNALS
// =============================================================================

router.get('/signals', asyncHandler(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;

  const [signals, total] = await Promise.all([
    prisma.signal.findMany({
      include: {
        provider: { select: { email: true, name: true } },
        _count: { select: { executions: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.signal.count(),
  ]);

  res.json({
    signals: signals.map((s) => ({
      id: s.id,
      action: s.action,
      symbol: s.symbol,
      type: s.type,
      volume: Number(s.volume),
      price: Number(s.price),
      status: s.status,
      provider: s.provider,
      executionCount: s._count.executions,
      createdAt: s.createdAt,
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}));

// =============================================================================
// MANAGE SUBSCRIPTION TIERS
// =============================================================================

router.get('/tiers', asyncHandler(async (req: Request, res: Response) => {
  const tiers = await prisma.subscriptionTier.findMany({
    orderBy: { sortOrder: 'asc' },
  });

  res.json({ tiers });
}));

router.post('/tiers', asyncHandler(async (req: Request, res: Response) => {
  const tier = await prisma.subscriptionTier.create({
    data: req.body,
  });

  res.status(201).json({ tier });
}));

router.put('/tiers/:tierId', asyncHandler(async (req: Request, res: Response) => {
  const { tierId } = req.params;

  const tier = await prisma.subscriptionTier.update({
    where: { id: tierId },
    data: req.body,
  });

  res.json({ tier });
}));

// =============================================================================
// REVENUE REPORTS
// =============================================================================

router.get('/revenue', asyncHandler(async (req: Request, res: Response) => {
  const months = parseInt(req.query.months as string) || 12;
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const payments = await prisma.payment.findMany({
    where: {
      status: 'SUCCEEDED',
      paidAt: { gte: startDate },
    },
    orderBy: { paidAt: 'asc' },
  });

  // Group by month
  const monthlyRevenue: Record<string, number> = {};
  payments.forEach((p) => {
    if (p.paidAt) {
      const key = `${p.paidAt.getFullYear()}-${String(p.paidAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyRevenue[key] = (monthlyRevenue[key] || 0) + Number(p.amount);
    }
  });

  res.json({
    monthlyRevenue,
    total: payments.reduce((sum, p) => sum + Number(p.amount), 0),
  });
}));

export default router;
