// =============================================================================
// USER ROUTES
// =============================================================================

import { Router, Request, Response } from "express";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { hashPassword, comparePassword } from "../services/auth.service.js";
import { notifyPasswordChanged } from "../services/notification.service.js";
import { strongPasswordSchema } from "../utils/password-policy.js";
import { env } from "../config/env.js";
import {
  generateMt5ApiKey,
  hashMt5ApiKey,
  isHashedMt5ApiKey,
} from "../utils/api-key.js";
import { userRepository } from "../database/repositories/index.js";

const router = Router();
const AVATAR_BUCKET_DIR = path.resolve(process.cwd(), "uploads", "avatars");
const MAX_OPTIMIZED_AVATAR_BYTES = 512 * 1024;
const ALLOWED_AVATAR_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function getAvatarExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  return "webp";
}

function hasValidImageSignature(buffer: Buffer, mimeType: string) {
  if (mimeType === "image/jpeg") {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === "image/png") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    );
  }

  return (
    mimeType === "image/webp" &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function parseAvatarDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);

  if (!match) {
    throw new Error("Please upload a JPG, PNG, or WebP image.");
  }

  const [, mimeType, base64Data] = match;

  if (!ALLOWED_AVATAR_MIME_TYPES.has(mimeType)) {
    throw new Error("Please upload a JPG, PNG, or WebP image.");
  }

  const buffer = Buffer.from(base64Data, "base64");

  if (!buffer.length || buffer.length > MAX_OPTIMIZED_AVATAR_BYTES) {
    throw new Error("The optimized avatar is too large to save.");
  }

  if (!hasValidImageSignature(buffer, mimeType)) {
    throw new Error("That image appears to be corrupted. Please choose another photo.");
  }

  return { buffer, extension: getAvatarExtension(mimeType) };
}

async function removeStoredAvatar(avatar?: string | null) {
  if (!avatar) return;

  try {
    const avatarUrl = new URL(avatar, env.API_URL);
    const normalizedPath = avatarUrl.pathname.replace(/\\/g, "/");

    if (!normalizedPath.startsWith("/uploads/avatars/")) {
      return;
    }

    const fileName = path.basename(normalizedPath);
    await unlink(path.join(AVATAR_BUCKET_DIR, fileName));
  } catch {
    // Avatar cleanup is best-effort. The database update should not fail if a
    // previous local file is already gone or the value points to external storage.
  }
}

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
// UPLOAD USER AVATAR
// =============================================================================

const uploadAvatarSchema = z.object({
  image: z.string().max(750000),
});

router.post(
  "/profile/avatar",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { image } = uploadAvatarSchema.parse(req.body);
    const existingUser = await userRepository.findUserProfileById(req.user!.id);

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    let parsedAvatar: ReturnType<typeof parseAvatarDataUrl>;

    try {
      parsedAvatar = parseAvatarDataUrl(image);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid avatar image.",
      });
    }

    await mkdir(AVATAR_BUCKET_DIR, { recursive: true });

    const fileName = `${req.user!.id}-${randomUUID()}.${parsedAvatar.extension}`;
    await writeFile(path.join(AVATAR_BUCKET_DIR, fileName), parsedAvatar.buffer);

    const avatar = `${env.API_URL}/uploads/avatars/${fileName}`;
    const user = await userRepository.updateUserProfile(req.user!.id, {
      avatar,
    });

    await removeStoredAvatar(existingUser.avatar);

    res.json({
      user,
      avatar,
      message: "Avatar updated",
    });
  })
);

router.delete(
  "/profile/avatar",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const existingUser = await userRepository.findUserProfileById(req.user!.id);

    if (!existingUser) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = await userRepository.updateUserProfile(req.user!.id, {
      avatar: null,
    });

    await removeStoredAvatar(existingUser.avatar);

    res.json({ user, message: "Avatar removed" });
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

    const isSamePassword = await comparePassword(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        error: "New password must be different from your current password",
      });
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
