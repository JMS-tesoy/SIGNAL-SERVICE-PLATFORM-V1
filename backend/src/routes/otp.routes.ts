// =============================================================================
// OTP ROUTES
// =============================================================================

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  sendEmailOTP,
  sendSMSOTP,
  verifyOTP,
  setupTOTP,
  verifyTOTP,
  enableTwoFactor,
  disableTwoFactor,
} from '../services/otp.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import prisma from '../config/database.js';
import { OTPType } from '@prisma/client';

const router = Router();

// =============================================================================
// SEND EMAIL OTP
// =============================================================================

router.post('/send/email', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.body;

  if (!type || !['EMAIL_VERIFICATION', 'TWO_FACTOR_LOGIN'].includes(type)) {
    return res.status(400).json({ error: 'Invalid OTP type' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { email: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const result = await sendEmailOTP(req.user!.id, user.email, type as OTPType);

  if (!result.success) {
    return res.status(500).json({ error: result.message });
  }

  res.json({ message: result.message, expiresAt: result.expiresAt });
}));

// =============================================================================
// SEND SMS OTP
// =============================================================================

router.post('/send/sms', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { type, phone } = req.body;

  if (!type) {
    return res.status(400).json({ error: 'OTP type required' });
  }

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { phone: true },
  });

  const phoneNumber = phone || user?.phone;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number required' });
  }

  const result = await sendSMSOTP(req.user!.id, phoneNumber, type as OTPType);

  if (!result.success) {
    return res.status(500).json({ error: result.message });
  }

  res.json({ message: result.message, expiresAt: result.expiresAt });
}));

// =============================================================================
// VERIFY OTP
// =============================================================================

router.post('/verify', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { code, type } = req.body;

  if (!code || !type) {
    return res.status(400).json({ error: 'Code and type required' });
  }

  const result = await verifyOTP(req.user!.id, code, type as OTPType);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ message: result.message });
}));

// =============================================================================
// SETUP TOTP (Authenticator App)
// =============================================================================

router.post('/totp/setup', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { email: true, twoFactorEnabled: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ error: '2FA is already enabled' });
  }

  const result = await setupTOTP(req.user!.id, user.email);

  res.json({
    secret: result.secret,
    qrCode: result.qrCodeUrl,
    manualEntryKey: result.manualEntryKey,
    message: 'Scan the QR code with your authenticator app',
  });
}));

// =============================================================================
// VERIFY AND ENABLE TOTP
// =============================================================================

router.post('/totp/enable', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code || code.length !== 6) {
    return res.status(400).json({ error: 'Valid 6-digit code required' });
  }

  const result = await enableTwoFactor(req.user!.id, code);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({
    message: result.message,
    backupCodes: result.backupCodes,
  });
}));

// =============================================================================
// DISABLE 2FA
// =============================================================================

router.post('/totp/disable', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { password } = req.body;

  // Verify password before disabling 2FA
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { password: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Import bcrypt for password verification
  const bcrypt = await import('bcryptjs');
  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const result = await disableTwoFactor(req.user!.id);
  res.json({ message: result.message });
}));

// =============================================================================
// GET 2FA STATUS
// =============================================================================

router.get('/status', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      twoFactorEnabled: true,
      twoFactorMethod: true,
      emailVerified: true,
      phone: true,
    },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    twoFactorEnabled: user.twoFactorEnabled,
    twoFactorMethod: user.twoFactorMethod,
    emailVerified: user.emailVerified,
    hasPhone: !!user.phone,
  });
}));

export default router;
