// =============================================================================
// AUTHENTICATION MIDDLEWARE
// =============================================================================

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../services/auth.service.js';
import prisma from '../config/database.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
      };
      accountId?: string;
      mt5Account?: {
        id: string;
        accountId: string;
        accountType: string;
        userId: string;
      };
    }
  }
}

// =============================================================================
// API KEY AUTHENTICATION (for MT5 EAs)
// =============================================================================

async function authenticateWithApiKey(apiKey: string): Promise<{
  user: { id: string; email: string; role: string };
  mt5Account: { id: string; accountId: string; accountType: string; userId: string };
} | null> {
  const mt5Account = await prisma.mT5Account.findUnique({
    where: { apiKey },
    include: {
      user: {
        select: { id: true, email: true, role: true, status: true },
      },
    },
  });

  if (!mt5Account || !mt5Account.user) {
    return null;
  }

  if (mt5Account.user.status === 'BANNED' || mt5Account.user.status === 'SUSPENDED') {
    return null;
  }

  return {
    user: {
      id: mt5Account.user.id,
      email: mt5Account.user.email,
      role: mt5Account.user.role,
    },
    mt5Account: {
      id: mt5Account.id,
      accountId: mt5Account.accountId,
      accountType: mt5Account.accountType,
      userId: mt5Account.userId,
    },
  };
}

// =============================================================================
// JWT AUTHENTICATION
// =============================================================================

export async function authenticate(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    // Try API key authentication first (for MT5 EAs)
    if (apiKey) {
      const result = await authenticateWithApiKey(apiKey);
      if (result) {
        req.user = result.user;
        req.mt5Account = result.mt5Account;
        req.accountId = result.mt5Account.accountId;
        return next();
      }
      return res.status(401).json({ error: 'Invalid API key' });
    }

    // Fall back to JWT authentication
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyToken(token);

    if (!payload || payload.type !== 'access') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user || user.status === 'BANNED' || user.status === 'SUSPENDED') {
      return res.status(401).json({ error: 'Account is not active' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    // Get account ID from header (for EA requests)
    req.accountId = req.headers['x-account-id'] as string;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

// =============================================================================
// OPTIONAL AUTHENTICATION (doesn't fail if no token)
// =============================================================================

export async function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);

      if (payload && payload.type === 'access') {
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, email: true, role: true, status: true },
        });

        if (user && user.status === 'ACTIVE') {
          req.user = { id: user.id, email: user.email, role: user.role };
        }
      }
    }

    next();
  } catch (error) {
    // Silently continue without auth
    next();
  }
}

// =============================================================================
// ROLE-BASED ACCESS CONTROL
// =============================================================================

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}

// =============================================================================
// ADMIN ONLY
// =============================================================================

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// =============================================================================
// EMAIL VERIFIED CHECK
// =============================================================================

export async function requireEmailVerified(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { emailVerified: true },
  });

  if (!user?.emailVerified) {
    return res.status(403).json({ error: 'Email verification required' });
  }

  next();
}

// =============================================================================
// SUBSCRIPTION CHECK
// =============================================================================

export async function requireActiveSubscription(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const subscription = await prisma.subscription.findUnique({
    where: { userId: req.user.id },
    include: { tier: true },
  });

  if (!subscription || subscription.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Active subscription required' });
  }

  // Check if subscription period has expired (cron may not have updated status yet)
  if (subscription.currentPeriodEnd < new Date()) {
    return res.status(403).json({ error: 'Subscription period has expired' });
  }

  next();
}
