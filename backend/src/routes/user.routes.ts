// =============================================================================
// USER ROUTES
// =============================================================================

import { Router, Request, Response } from "express";
import { z } from "zod";
import crypto from "crypto";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { hashPassword, comparePassword } from "../services/auth.service.js";
import { notifyPasswordChanged } from "../services/notification.service.js";
import prisma from "../config/database.js";

const router = Router();

// =============================================================================
// GET USER PROFILE
// =============================================================================

router.get(
  "/profile",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
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

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ user });
  })
);

// =============================================================================
// UPDATE USER PROFILE
// =============================================================================

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  avatar: z.string().max(500000).optional(), // Base64 encoded, ~375KB max image
});

router.put(
  "/profile",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const data = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatar: true,
      },
    });

    res.json({ user, message: "Profile updated" });
  })
);

// =============================================================================
// CHANGE PASSWORD
// =============================================================================

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

router.put(
  "/password",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body
    );

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: { password: true },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: req.user!.id },
      data: { password: hashedPassword },
      select: { email: true, name: true },
    });

    // Invalidate all sessions except current
    const currentToken = req.headers.authorization?.split(" ")[1];
    if (currentToken) {
      await prisma.session.deleteMany({
        where: {
          userId: req.user!.id,
          token: { not: currentToken },
        },
      });
    }

    // Send password change notification (non-blocking)
    notifyPasswordChanged(
      req.user!.id,
      updatedUser.email,
      updatedUser.name || "Trader",
      {
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("user-agent"),
      }
    ).catch((err) =>
      console.error("Failed to send password change notification:", err)
    );

    res.json({ message: "Password changed successfully" });
  })
);

// =============================================================================
// ADD MT5 ACCOUNT
// =============================================================================

const addMT5AccountSchema = z.object({
  accountId: z.string().min(1).max(50),
  accountType: z.enum(["MASTER", "SLAVE"]),
  broker: z.string().optional(),
  server: z.string().optional(),
});

router.post(
  "/mt5-accounts",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const data = addMT5AccountSchema.parse(req.body);

    // Check subscription limits for slave accounts
    if (data.accountType === "SLAVE") {
      const subscription = await prisma.subscription.findUnique({
        where: { userId: req.user!.id },
        include: { tier: true },
      });

      // Users without an active subscription cannot add SLAVE accounts
      if (!subscription || subscription.status !== "ACTIVE") {
        return res.status(403).json({
          error: "An active subscription is required to add slave accounts.",
        });
      }

      const currentSlaveCount = await prisma.mT5Account.count({
        where: { userId: req.user!.id, accountType: "SLAVE" },
      });

      if (currentSlaveCount >= subscription.tier.maxSlaveAccounts) {
        return res.status(403).json({
          error: `Your plan allows ${subscription.tier.maxSlaveAccounts} slave account(s). Upgrade to add more.`,
        });
      }
    }

    const account = await prisma.mT5Account.create({
      data: {
        userId: req.user!.id,
        ...data,
      },
    });

    res.status(201).json({ account, message: "MT5 account added" });
  })
);

// =============================================================================
// GET MT5 ACCOUNTS
// =============================================================================

router.get(
  "/mt5-accounts",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const accounts = await prisma.mT5Account.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        accountId: a.accountId,
        accountType: a.accountType,
        broker: a.broker,
        server: a.server,
        isConnected: a.isConnected,
        lastHeartbeat: a.lastHeartbeat,
        balance: a.balance ? Number(a.balance) : null,
        equity: a.equity ? Number(a.equity) : null,
        profit: a.profit ? Number(a.profit) : null,
      })),
    });
  })
);

// =============================================================================
// GENERATE API KEY FOR MT5 ACCOUNT (FIXED)
// =============================================================================

router.post(
  "/mt5-accounts/:accountId/api-key",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // :accountId here represents the database UUID, matching the frontend call
    const { accountId } = req.params;

    const account = await prisma.mT5Account.findFirst({
      where: { id: accountId, userId: req.user!.id },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    // Generate a secure API key (32 bytes = 64 hex chars)
    const apiKey = `mt5_${crypto.randomBytes(32).toString("hex")}`;

    await prisma.mT5Account.update({
      where: { id: accountId },
      data: { apiKey },
    });

    res.json({
      apiKey,
      message:
        "API key generated. Store this securely - it cannot be retrieved later.",
      usage: {
        header: "X-API-Key",
        example: `curl -H "X-API-Key: ${apiKey}" https://api.example.com/api/signals`,
      },
    });
  })
);

// =============================================================================
// REVOKE API KEY FOR MT5 ACCOUNT
// =============================================================================

router.delete(
  "/mt5-accounts/:accountId/api-key",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { accountId } = req.params;

    const account = await prisma.mT5Account.findFirst({
      where: { id: accountId, userId: req.user!.id },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    await prisma.mT5Account.update({
      where: { id: accountId },
      data: { apiKey: null },
    });

    res.json({ message: "API key revoked" });
  })
);

// =============================================================================
// DELETE MT5 ACCOUNT
// =============================================================================

router.delete(
  "/mt5-accounts/:accountId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { accountId } = req.params;

    const account = await prisma.mT5Account.findFirst({
      where: { id: accountId, userId: req.user!.id },
    });

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    await prisma.mT5Account.delete({
      where: { id: accountId },
    });

    res.json({ message: "MT5 account removed" });
  })
);

// =============================================================================
// GET USER SESSIONS
// =============================================================================

router.get(
  "/sessions",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const sessions = await prisma.session.findMany({
      where: { userId: req.user!.id },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const currentToken = req.headers.authorization?.split(" ")[1];

    res.json({
      sessions: sessions.map((s) => ({
        ...s,
        isCurrent: false, // You would need logic here to compare DB token hash if stored, or ID
      })),
    });
  })
);

// =============================================================================
// REVOKE SESSION
// =============================================================================

router.delete(
  "/sessions/:sessionId",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { sessionId } = req.params;

    await prisma.session.deleteMany({
      where: { id: sessionId, userId: req.user!.id },
    });

    res.json({ message: "Session revoked" });
  })
);

// =============================================================================
// REVOKE ALL OTHER SESSIONS
// =============================================================================

router.delete(
  "/sessions",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const currentToken = req.headers.authorization?.split(" ")[1];

    await prisma.session.deleteMany({
      where: {
        userId: req.user!.id,
        token: { not: currentToken },
      },
    });

    res.json({ message: "All other sessions revoked" });
  })
);

export default router;
