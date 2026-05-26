// =============================================================================
// USER ROUTES
// =============================================================================

import { Router, Request, Response } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { hashPassword, comparePassword } from "../services/auth.service.js";
import { notifyPasswordChanged } from "../services/notification.service.js";
import { strongPasswordSchema } from "../utils/password-policy.js";
import {
  generateMt5ApiKey,
  hashMt5ApiKey,
  isHashedMt5ApiKey,
} from "../utils/api-key.js";
import { userRepository } from "../database/repositories/index.js";

const router = Router();

// =============================================================================
// GET USER PROFILE
// =============================================================================

router.get(
  "/profile",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await userRepository.findUserProfileById(req.user!.id);

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

    const user = await userRepository.updateUserProfile(req.user!.id, data);

    res.json({ user, message: "Profile updated" });
  })
);

// =============================================================================
// CHANGE PASSWORD
// =============================================================================

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: strongPasswordSchema,
});

router.put(
  "/password",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = changePasswordSchema.parse(
      req.body
    );

    const user = await userRepository.findUserPasswordById(req.user!.id);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const isValid = await comparePassword(currentPassword, user.password);
    if (!isValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await userRepository.updateUserPassword(
      req.user!.id,
      hashedPassword
    );

    // Invalidate all sessions except current
    const currentToken = req.headers.authorization?.split(" ")[1];
    if (currentToken) {
      await userRepository.deleteOtherUserSessions(req.user!.id, currentToken);
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
  server: z.string().trim().min(1, "Server is required").max(100),
});

router.post(
  "/mt5-accounts",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const data = addMT5AccountSchema.parse(req.body);

    const subscription = await userRepository.findSubscriptionWithTierByUserId(
      req.user!.id
    );

    if (data.accountType === "MASTER") {
      if (!subscription || subscription.status !== "ACTIVE") {
        return res.status(403).json({
          error: "An active paid subscription is required to add master accounts.",
        });
      }

      if (subscription.tier.name === "free") {
        return res.status(403).json({
          error: "Master Signal Provider accounts require a paid plan.",
        });
      }
    }

    // Check subscription limits for slave accounts
    if (data.accountType === "SLAVE") {
      // Users without an active subscription cannot add SLAVE accounts
      if (!subscription || subscription.status !== "ACTIVE") {
        return res.status(403).json({
          error: "An active subscription is required to add slave accounts.",
        });
      }

      const currentSlaveCount = await userRepository.countSlaveAccountsByUserId(
        req.user!.id
      );

      if (currentSlaveCount >= subscription.tier.maxSlaveAccounts) {
        return res.status(403).json({
          error: `Your plan allows ${subscription.tier.maxSlaveAccounts} slave account(s). Upgrade to add more.`,
        });
      }
    }

    const account = await userRepository.createMt5Account(req.user!.id, data);

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
    const [accounts, subscription, currentSlaveCount] = await Promise.all([
      userRepository.findMt5AccountsByUserId(req.user!.id),
      userRepository.findSubscriptionWithTierByUserId(req.user!.id),
      userRepository.countSlaveAccountsByUserId(req.user!.id),
    ]);

    await Promise.all(
      accounts
        .filter((account) => account.apiKey && !isHashedMt5ApiKey(account.apiKey))
        .map((account) =>
          userRepository.updateMt5AccountApiKey(
            account.id,
            hashMt5ApiKey(account.apiKey!)
          )
        )
    );

    res.json({
      accounts: accounts.map((a) => ({
        id: a.id,
        accountId: a.accountId,
        accountType: a.accountType,
        broker: a.broker,
        server: a.server,
        isConnected: a.isConnected,
        lastHeartbeat: a.lastHeartbeat,
        hasApiKey: Boolean(a.apiKey),
        balance: a.balance ? Number(a.balance) : null,
        equity: a.equity ? Number(a.equity) : null,
        profit: a.profit ? Number(a.profit) : null,
      })),
      planUsage: {
        currentSlaveAccounts: currentSlaveCount,
        maxSlaveAccounts: subscription?.tier.maxSlaveAccounts ?? 0,
        subscriptionStatus: subscription?.status ?? null,
        tierName: subscription?.tier.name ?? null,
      },
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

    const account = await userRepository.findMt5AccountByIdAndUserId(
      accountId,
      req.user!.id
    );

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const apiKey = generateMt5ApiKey();

    await userRepository.updateMt5AccountApiKey(
      accountId,
      hashMt5ApiKey(apiKey)
    );

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

    const account = await userRepository.findMt5AccountByIdAndUserId(
      accountId,
      req.user!.id
    );

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    await userRepository.updateMt5AccountApiKey(accountId, null);

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

    const account = await userRepository.findMt5AccountByIdAndUserId(
      accountId,
      req.user!.id
    );

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    await userRepository.deleteMt5AccountById(accountId);

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
    const sessions = await userRepository.findUserSessions(req.user!.id);

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

    await userRepository.deleteUserSession(sessionId, req.user!.id);

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

    await userRepository.deleteOtherUserSessions(req.user!.id, currentToken);

    res.json({ message: "All other sessions revoked" });
  })
);

export default router;
