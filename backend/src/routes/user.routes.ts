// =============================================================================
// USER ROUTES
// =============================================================================

import { Router, Request, Response } from "express";
import { authenticate } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { hashPassword, comparePassword } from "../services/auth.service.js";
import { notifyPasswordChanged } from "../services/notification.service.js";
import {
  generateMt5ApiKey,
  hashMt5ApiKey,
  isHashedMt5ApiKey,
} from "../utils/api-key.js";
import {
  parseAvatarDataUrl,
  removeStoredAvatar,
  saveParsedAvatarImage,
} from "../utils/avatar.js";
import {
  formatMt5Account,
  formatMt5ApiKeyUsage,
  formatPlanUsage,
} from "../utils/mt5-account-presenter.js";
import {
  getMt5AccountEligibilityError,
  getMt5AssignmentEligibilityError,
  getMt5EnvironmentEligibilityError,
} from "../utils/mt5-account-policy.js";
import { userRepository } from "../database/repositories/index.js";
import {
  addMT5AccountSchema,
  assignMT5ReceiverMasterSchema,
  changePasswordSchema,
  updateProfileSchema,
  uploadAvatarSchema,
} from "./schemas/user.schemas.js";

const router = Router();

function getBearerToken(req: Request) {
  return req.headers.authorization?.split(" ")[1];
}

async function findUserProfileOrRespond(userId: string, res: Response) {
  const user = await userRepository.findUserProfileById(userId);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return null;
  }

  return user;
}

async function ensureOwnedMt5AccountOrRespond(
  accountId: string,
  userId: string,
  res: Response
) {
  const account = await userRepository.findMt5AccountByIdAndUserId(
    accountId,
    userId
  );

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return false;
  }

  return true;
}

// =============================================================================
// GET USER PROFILE
// =============================================================================

router.get(
  "/profile",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await findUserProfileOrRespond(req.user!.id, res);

    if (!user) {
      return;
    }

    res.json({ user });
  })
);

// =============================================================================
// UPDATE USER PROFILE
// =============================================================================

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

router.post(
  "/profile/avatar",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { image } = uploadAvatarSchema.parse(req.body);
    const existingUser = await findUserProfileOrRespond(req.user!.id, res);

    if (!existingUser) {
      return;
    }

    let parsedAvatar: ReturnType<typeof parseAvatarDataUrl>;

    try {
      parsedAvatar = parseAvatarDataUrl(image);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : "Invalid avatar image.",
      });
    }

    const avatar = await saveParsedAvatarImage(req.user!.id, parsedAvatar);
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
    const existingUser = await findUserProfileOrRespond(req.user!.id, res);

    if (!existingUser) {
      return;
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
    const currentToken = getBearerToken(req);
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

router.post(
  "/mt5-accounts",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const data = addMT5AccountSchema.parse(req.body);

    const subscription = await userRepository.findSubscriptionWithTierByUserId(
      req.user!.id
    );

    const currentSlaveCount =
      data.accountType === "SLAVE"
        ? await userRepository.countSlaveAccountsByUserId(req.user!.id)
        : 0;

    const eligibilityError = getMt5AccountEligibilityError({
      accountType: data.accountType,
      accountEnvironment: data.accountEnvironment,
      subscription,
      currentSlaveCount,
    });

    if (eligibilityError) {
      return res.status(403).json({ error: eligibilityError });
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
      userRepository.updateMt5AccountApiKey(account.id, {
        apiKey: hashMt5ApiKey(account.apiKey!),
        apiKeyPrefix: account.apiKey!.slice(0, 12),
        apiKeyRevokedAt: null,
        apiKeyLastUsedAt: null,
      })
    )
);

    res.json({
      accounts: accounts.map(formatMt5Account),
      planUsage: formatPlanUsage(subscription, currentSlaveCount),
    });
  })
);

// =============================================================================
// ASSIGN MASTER ACCOUNT TO MT5 RECEIVER
// =============================================================================

router.patch(
  "/mt5-accounts/:receiverId/assign-master",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { receiverId } = req.params;
    const { masterAccountId } = assignMT5ReceiverMasterSchema.parse(req.body);

    const [receiver, master, subscription] = await Promise.all([
      userRepository.findMt5AccountByIdAndUserId(receiverId, req.user!.id),
      userRepository.findMt5AccountByIdAndUserId(masterAccountId, req.user!.id),
      userRepository.findSubscriptionWithTierByUserId(req.user!.id),
    ]);

    if (!receiver) {
      return res.status(404).json({ error: "Receiver account not found" });
    }

    if (receiver.accountType !== "SLAVE") {
      return res
        .status(400)
        .json({ error: "Only Receiver / Slave accounts can follow a master" });
    }

    if (!master) {
      return res.status(404).json({ error: "Master account not found" });
    }

    if (master.accountType !== "MASTER") {
      return res
        .status(400)
        .json({ error: "Selected account is not a Master account" });
    }

    if (master.status !== "ACTIVE") {
      return res
        .status(400)
        .json({ error: "Selected Master account must be active" });
    }

    const assignmentEligibilityError = getMt5AssignmentEligibilityError({
      subscription,
      receiver,
      master,
    });

    if (assignmentEligibilityError) {
      return res.status(403).json({ error: assignmentEligibilityError });
    }

    const account = await userRepository.assignMt5ReceiverMaster(
      receiver.id,
      master.id
    );

    res.json({
      account: formatMt5Account(account),
      assignedMaster: account.allowedMasterAccount
        ? {
            id: account.allowedMasterAccount.id,
            accountId: account.allowedMasterAccount.accountId,
            accountEnvironment: account.allowedMasterAccount.accountEnvironment,
            broker: account.allowedMasterAccount.broker,
            server: account.allowedMasterAccount.server,
            status: account.allowedMasterAccount.status,
          }
        : null,
      message: "Receiver master assignment saved",
    });
  })
);

// =============================================================================
// GENERATE API KEY FOR MT5 ACCOUNT
// =============================================================================

router.post(
  "/mt5-accounts/:accountId/api-key",
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    // :accountId here represents the database UUID, matching the frontend call
    const { accountId } = req.params;

    const hasAccountAccess = await ensureOwnedMt5AccountOrRespond(
      accountId,
      req.user!.id,
      res
    );

    if (!hasAccountAccess) {
      return;
    }

    const apiKey = generateMt5ApiKey();

    const account = await userRepository.findMt5AccountByIdAndUserId(
      accountId,
      req.user!.id
    );

    if (!account) {
      return res.status(404).json({ error: "Account not found" });
    }

    const subscription = await userRepository.findSubscriptionWithTierByUserId(
      req.user!.id
    );

    const environmentEligibilityError = getMt5EnvironmentEligibilityError({
      subscription,
      accountEnvironment: account.accountEnvironment,
    });

    if (environmentEligibilityError) {
      return res.status(403).json({ error: environmentEligibilityError });
    }

    await userRepository.updateMt5AccountApiKey(accountId, {
      apiKey: hashMt5ApiKey(apiKey),
      apiKeyPrefix: apiKey.slice(0, 12),
      apiKeyRevokedAt: null,
      apiKeyLastUsedAt: null,
      status: "ACTIVE",
      minEaVersion: "1.0.0",
      maxDevices: 1,
      allowSignalSend: account.accountType === "MASTER",
      allowSignalReceive: account.accountType === "SLAVE",
      isConnected: false,
    });

    res.json({
      apiKey,
      message:
        "API key generated. Store this securely - it cannot be retrieved later.",
      usage: formatMt5ApiKeyUsage(apiKey),
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

    const hasAccountAccess = await ensureOwnedMt5AccountOrRespond(
      accountId,
      req.user!.id,
      res
    );

    if (!hasAccountAccess) {
      return;
    }

    await userRepository.updateMt5AccountApiKey(accountId, {
  apiKeyRevokedAt: new Date(),
  isConnected: false,
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

    const hasAccountAccess = await ensureOwnedMt5AccountOrRespond(
      accountId,
      req.user!.id,
      res
    );

    if (!hasAccountAccess) {
      return;
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
    const currentToken = getBearerToken(req);

    await userRepository.deleteOtherUserSessions(req.user!.id, currentToken);

    res.json({ message: "All other sessions revoked" });
  })
);

export default router;
