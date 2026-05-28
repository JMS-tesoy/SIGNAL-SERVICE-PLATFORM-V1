// =============================================================================
// AUTHENTICATION ROUTES
// =============================================================================

import { Router, Request, Response } from 'express';
import {
  register,
  login,
  verifyTwoFactorAndLogin,
  resendTwoFactorOTP,
  refreshAccessToken,
  logout,
  requestPasswordReset,
  resetPassword,
  verifyEmailWithCode,
  resendVerificationEmail,
} from './auth.service.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../middleware/error.middleware.js';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendTwoFactorSchema,
  resetPasswordSchema,
  twoFactorSchema,
  verifyEmailSchema,
} from './auth.schema.js';

const router = Router();

// =============================================================================
// ROUTES
// =============================================================================

// Register
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const data = registerSchema.parse(req.body);
  const result = await register(data);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.status(201).json({
    message: result.message,
    user: result.user,
  });
}));

// Login
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const data = loginSchema.parse(req.body);
  const result = await login({
    ...data,
    ipAddress: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent'),
  });

  if (!result.success) {
    return res.status(401).json({ error: result.message });
  }

  // If 2FA is required
  if (result.requiresTwoFactor) {
    return res.status(200).json({
      requiresTwoFactor: true,
      twoFactorMethod: result.twoFactorMethod,
      tempToken: result.tempToken,
      message: result.message,
    });
  }

  res.json({
    message: result.message,
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}));

// Verify 2FA
router.post('/verify-2fa', asyncHandler(async (req: Request, res: Response) => {
  const data = twoFactorSchema.parse(req.body);
  const result = await verifyTwoFactorAndLogin(
    data.tempToken,
    data.code,
    data.method,
    req.ip || req.connection.remoteAddress,
    req.get('user-agent')
  );

  if (!result.success) {
    return res.status(401).json({ error: result.message });
  }

  res.json({
    message: result.message,
    user: result.user,
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
}));

// Resend 2FA OTP
router.post('/resend-2fa', asyncHandler(async (req: Request, res: Response) => {
  const data = resendTwoFactorSchema.parse(req.body);
  const result = await resendTwoFactorOTP(data.tempToken);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({
    message: result.message,
    twoFactorMethod: result.twoFactorMethod,
  });
}));

// Refresh token
router.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  const result = await refreshAccessToken(refreshToken);

  if (!result.success) {
    return res.status(401).json({ error: result.message });
  }

  res.json({
    accessToken: result.accessToken,
  });
}));

// Logout
router.post('/logout', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    await logout(token);
  }

  res.json({ message: 'Logged out successfully' });
}));

// Request password reset
router.post('/forgot-password', asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const result = await requestPasswordReset(email);
  res.json({ message: result.message });
}));

// Reset password
router.post('/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const data = resetPasswordSchema.parse(req.body);
  const result = await resetPassword(data.email, data.code, data.newPassword);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ message: result.message });
}));

// Verify email (unauthenticated - for registration flow)
router.post('/verify-email', asyncHandler(async (req: Request, res: Response) => {
  const { email, code } = verifyEmailSchema.parse(req.body);

  const result = await verifyEmailWithCode(email, code);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ message: result.message });
}));

// Resend verification email (unauthenticated - for registration flow)
router.post('/resend-verification', asyncHandler(async (req: Request, res: Response) => {
  const { email } = forgotPasswordSchema.parse(req.body);

  const result = await resendVerificationEmail(email);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ message: result.message });
}));

// Get current user
router.get('/me', authenticate, asyncHandler(async (req: Request, res: Response) => {
  res.json({ user: req.user });
}));

export default router;
