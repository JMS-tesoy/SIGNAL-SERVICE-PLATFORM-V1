// =============================================================================
// SECURITY ROUTES - Email Verification, 2FA, Sessions
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../config/database.js';
import {
  sendEmailOTP,
  verifyOTP,
  setupTOTP,
  verifyTOTP,
  enableTwoFactor,
  disableTwoFactor,
} from '../services/otp.service.js';
import {
  notifyEmailVerified,
  notifyTwoFactorEnabled,
  notifyTwoFactorDisabled,
  notifySessionsRevoked,
} from '../services/notification.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { OTPType } from '@prisma/client';

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const verifyEmailSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

const resendEmailSchema = z.object({
  email: z.string().email(),
});

const setupTOTPSchema = z.object({
  // No body needed, will use authenticated user
});

const enableTOTPSchema = z.object({
  code: z.string().length(6, 'Code must be 6 digits'),
});

// =============================================================================
// EMAIL VERIFICATION ROUTES
// =============================================================================

// Send/Resend email verification code
router.post('/email/send-verification', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.emailVerified) {
    return res.status(400).json({ error: 'Email already verified' });
  }

  const result = await sendEmailOTP(user.id, user.email, OTPType.EMAIL_VERIFICATION);

  if (!result.success) {
    return res.status(500).json({ error: result.message });
  }

  res.json({
    message: 'Verification code sent to your email',
    expiresAt: result.expiresAt,
  });
}));

// Verify email with code
router.post('/email/verify', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const data = verifyEmailSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.emailVerified) {
    return res.status(400).json({ error: 'Email already verified' });
  }

  const result = await verifyOTP(user.id, data.code, OTPType.EMAIL_VERIFICATION);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  // Update user status from PENDING_VERIFICATION to ACTIVE
  await prisma.user.update({
    where: { id: user.id },
    data: { status: 'ACTIVE' },
  });

  // Send notification
  await notifyEmailVerified(user.id, user.email, user.name || 'Trader');

  res.json({
    message: 'Email verified successfully',
    user: {
      id: user.id,
      email: user.email,
      emailVerified: true,
    },
  });
}));

// Check email verification status
router.get('/email/status', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      emailVerified: true,
      emailVerifiedAt: true,
    },
  });

  res.json({
    verified: user?.emailVerified || false,
    verifiedAt: user?.emailVerifiedAt,
  });
}));

// =============================================================================
// TWO-FACTOR AUTHENTICATION ROUTES
// =============================================================================

// Get 2FA status
router.get('/2fa/status', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      twoFactorEnabled: true,
      twoFactorMethod: true,
    },
  });

  res.json({
    enabled: user?.twoFactorEnabled || false,
    method: user?.twoFactorMethod || null,
  });
}));

// Setup TOTP (Authenticator App)
router.post('/2fa/setup-totp', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: 'Two-factor authentication is already enabled. Disable it first to reconfigure.' });
  }

  const result = await setupTOTP(user.id, user.email);

  res.json({
    message: 'Scan the QR code with your authenticator app',
    qrCode: result.qrCodeUrl,
    manualEntryKey: result.manualEntryKey,
    secret: result.secret,
  });
}));

// Enable 2FA after verifying TOTP code
router.post('/2fa/enable-totp', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const data = enableTOTPSchema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: 'Two-factor authentication is already enabled' });
  }

  if (!user.twoFactorSecret) {
    return res.status(400).json({ error: 'Please setup TOTP first by calling /2fa/setup-totp' });
  }

  const result = await enableTwoFactor(user.id, data.code);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  // Send notification
  await notifyTwoFactorEnabled(user.id, user.email, user.name || 'Trader');

  res.json({
    message: result.message,
    backupCodes: result.backupCodes,
  });
}));

// Setup Email 2FA
router.post('/2fa/enable-email', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.emailVerified) {
    return res.status(400).json({ error: 'Please verify your email first' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: 'Two-factor authentication is already enabled' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorMethod: 'EMAIL',
    },
  });

  // Send notification
  await notifyTwoFactorEnabled(user.id, user.email, user.name || 'Trader');

  res.json({
    message: 'Email two-factor authentication enabled successfully',
  });
}));

// Disable 2FA
router.post('/2fa/disable', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password is required to disable 2FA' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!user.twoFactorEnabled) {
    return res.status(400).json({ error: 'Two-factor authentication is not enabled' });
  }

  // Verify password
  const bcrypt = await import('bcryptjs');
  const isValidPassword = await bcrypt.compare(password, user.password);

  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const result = await disableTwoFactor(user.id);

  // Send notification
  await notifyTwoFactorDisabled(
    user.id,
    user.email,
    user.name || 'Trader',
    {
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
    }
  );

  res.json({
    message: result.message,
  });
}));

// =============================================================================
// SESSION MANAGEMENT ROUTES
// =============================================================================

// Get all active sessions
router.get('/sessions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const sessions = await prisma.session.findMany({
    where: {
      userId: req.user!.id,
      expiresAt: {
        gt: new Date(),
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    select: {
      id: true,
      token: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  // Determine current session
  const currentToken = req.headers.authorization?.split(' ')[1];

  const formattedSessions = sessions.map(session => ({
    id: session.id,
    userAgent: session.userAgent,
    ipAddress: session.ipAddress,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    isCurrent: session.token === currentToken,
  }));

  res.json({ sessions: formattedSessions });
}));

// Revoke specific session
router.delete('/sessions/:sessionId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session || session.userId !== req.user!.id) {
    return res.status(404).json({ error: 'Session not found' });
  }

  await prisma.session.delete({
    where: { id: sessionId },
  });

  res.json({ message: 'Session revoked successfully' });
}));

// Revoke all other sessions (keep current)
router.post('/sessions/revoke-all', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const currentToken = req.headers.authorization?.split(' ')[1];

  const result = await prisma.session.deleteMany({
    where: {
      userId: req.user!.id,
      token: {
        not: currentToken,
      },
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
  });

  if (user && result.count > 0) {
    await notifySessionsRevoked(
      user.id,
      user.email,
      user.name || 'Trader',
      result.count
    );
  }

  res.json({
    message: `${result.count} session(s) revoked successfully`,
    revokedCount: result.count,
  });
}));

// =============================================================================
// SECURITY ACTIVITY LOG
// =============================================================================

// Get recent security activity
router.get('/activity', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      lastLoginAt: true,
      lastLoginIp: true,
      emailVerifiedAt: true,
      twoFactorEnabled: true,
      updatedAt: true,
    },
  });

  const recentSessions = await prisma.session.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: {
      createdAt: true,
      ipAddress: true,
      userAgent: true,
    },
  });

  res.json({
    lastLogin: {
      at: user?.lastLoginAt,
      ip: user?.lastLoginIp,
    },
    emailVerified: !!user?.emailVerifiedAt,
    twoFactorEnabled: user?.twoFactorEnabled || false,
    recentSessions: recentSessions.map(s => ({
      timestamp: s.createdAt,
      ip: s.ipAddress,
      device: s.userAgent?.includes('Mobile') ? 'Mobile' : 'Desktop',
    })),
  });
}));

export default router;
