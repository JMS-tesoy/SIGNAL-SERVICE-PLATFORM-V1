// =============================================================================
// AUTHENTICATION SERVICE - JWT & Session Management
// =============================================================================

import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import { sendEmailOTP, verifyOTP, verifyTOTP } from './otp.service.js';
import { sendEmail, emailTemplates } from './email.service.js';
import { notifyNewLogin, notifyPasswordChanged } from './notification.service.js';
import { User, OTPType, TwoFactorMethod } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface RegisterInput {
  email: string;
  password: string;
  name?: string;
}

interface LoginInput {
  rememberMe?: boolean;
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

interface AuthResult {
  success: boolean;
  message: string;
  user?: Partial<User>;
  accessToken?: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  twoFactorMethod?: TwoFactorMethod;
  tempToken?: string; // Temporary token for 2FA flow
}

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  type: 'access' | 'refresh' | 'temp';
}

// =============================================================================
// JWT CONFIGURATION
// =============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
const REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN = process.env.REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN || '30d';

// Session durations in milliseconds
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const REMEMBER_ME_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// =============================================================================
// PASSWORD HASHING
// =============================================================================

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// =============================================================================
// TOKEN GENERATION
// =============================================================================

export function generateAccessToken(user: Pick<User, 'id' | 'email' | 'role'>): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'access',
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as SignOptions);
}

export function generateRefreshToken(user: Pick<User, 'id' | 'email' | 'role'>, rememberMe: boolean = false): string {
  const payload: TokenPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    type: 'refresh',
  };
  const expiresIn = rememberMe ? REMEMBER_ME_REFRESH_TOKEN_EXPIRES_IN : REFRESH_TOKEN_EXPIRES_IN;
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as SignOptions);
}

export function generateTempToken(userId: string): string {
  const options: SignOptions = { expiresIn: '10m' };
  return jwt.sign(
    { userId, type: 'temp' },
    JWT_SECRET,
    options
  );
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

// =============================================================================
// REGISTER
// =============================================================================

export async function register(input: RegisterInput): Promise<AuthResult> {
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      return {
        success: false,
        message: 'An account with this email already exists',
      };
    }

    // Hash password
    const hashedPassword = await hashPassword(input.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        password: hashedPassword,
        name: input.name,
        status: 'PENDING_VERIFICATION',
      },
    });

    // Create free subscription
    const freeTier = await prisma.subscriptionTier.findFirst({
      where: { name: 'free' },
    });

    if (freeTier) {
      await prisma.subscription.create({
        data: {
          userId: user.id,
          tierId: freeTier.id,
          status: 'ACTIVE',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });
    }

    // Send verification email OTP
    await sendEmailOTP(user.id, user.email, OTPType.EMAIL_VERIFICATION);

    // Send welcome email
    const welcomeEmail = emailTemplates.welcome(user.name || 'Trader');
    await sendEmail({
      to: user.email,
      subject: welcomeEmail.subject,
      html: welcomeEmail.html,
    });

    return {
      success: true,
      message: 'Registration successful. Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: user.emailVerified,
      },
    };
  } catch (error) {
    console.error('Registration error:', error);
    return {
      success: false,
      message: 'Registration failed. Please try again.',
    };
  }
}

// =============================================================================
// LOGIN
// =============================================================================

export async function login(input: LoginInput): Promise<AuthResult> {
  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Check account status
    if (user.status === 'BANNED') {
      return {
        success: false,
        message: 'Your account has been suspended',
      };
    }

    // Verify password
    const isValidPassword = await comparePassword(input.password, user.password);
    if (!isValidPassword) {
      return {
        success: false,
        message: 'Invalid email or password',
      };
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate temp token for 2FA flow
      const tempToken = generateTempToken(user.id);

      // If using email/SMS 2FA, send OTP
      if (user.twoFactorMethod === 'EMAIL') {
        await sendEmailOTP(user.id, user.email, OTPType.TWO_FACTOR_LOGIN);
      }

      return {
        success: true,
        message: 'Please complete two-factor authentication',
        requiresTwoFactor: true,
        twoFactorMethod: user.twoFactorMethod,
        tempToken,
      };
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, input.rememberMe);

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        expiresAt: new Date(Date.now() + (input.rememberMe ? REMEMBER_ME_SESSION_DURATION_MS : SESSION_DURATION_MS)),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: input.ipAddress,
      },
    });

    // Send login notification (non-blocking)
    notifyNewLogin(user.id, user.email, user.name || 'Trader', {
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
    }).catch(err => console.error('Failed to send login notification:', err));

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        emailVerified: user.emailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('Login error:', error);
    return {
      success: false,
      message: 'Login failed. Please try again.',
    };
  }
}

// =============================================================================
// VERIFY 2FA AND COMPLETE LOGIN
// =============================================================================

export async function verifyTwoFactorAndLogin(
  tempToken: string,
  code: string,
  method: TwoFactorMethod,
  ipAddress?: string,
  userAgent?: string,
  rememberMe: boolean = false
): Promise<AuthResult> {
  try {
    // Verify temp token
    const payload = verifyToken(tempToken);
    if (!payload || payload.type !== 'temp') {
      return {
        success: false,
        message: 'Invalid or expired session. Please login again.',
      };
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return {
        success: false,
        message: 'User not found',
      };
    }

    // Verify OTP based on method
    let verificationResult;
    if (method === 'TOTP') {
      verificationResult = await verifyTOTP(user.id, code);
    } else {
      verificationResult = await verifyOTP(user.id, code, OTPType.TWO_FACTOR_LOGIN);
    }

    if (!verificationResult.success) {
      return {
        success: false,
        message: verificationResult.message,
      };
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, rememberMe);

    // Create session
    await prisma.session.create({
      data: {
        userId: user.id,
        token: accessToken,
        refreshToken,
        ipAddress,
        userAgent,
        expiresAt: new Date(Date.now() + (rememberMe ? REMEMBER_ME_SESSION_DURATION_MS : SESSION_DURATION_MS)),
      },
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ipAddress,
      },
    });

    return {
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      accessToken,
      refreshToken,
    };
  } catch (error) {
    console.error('2FA verification error:', error);
    return {
      success: false,
      message: 'Verification failed. Please try again.',
    };
  }
}

// =============================================================================
// REFRESH TOKEN
// =============================================================================

export async function refreshAccessToken(refreshToken: string): Promise<AuthResult> {
  try {
    const payload = verifyToken(refreshToken);
    if (!payload || payload.type !== 'refresh') {
      return {
        success: false,
        message: 'Invalid refresh token',
      };
    }

    // Check if session exists
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return {
        success: false,
        message: 'Session expired. Please login again.',
      };
    }

    // Generate new access token
    const accessToken = generateAccessToken(session.user);

    // Update session
    await prisma.session.update({
      where: { id: session.id },
      data: { token: accessToken },
    });

    return {
      success: true,
      message: 'Token refreshed',
      accessToken,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return {
      success: false,
      message: 'Failed to refresh token',
    };
  }
}

// =============================================================================
// LOGOUT
// =============================================================================

export async function logout(token: string): Promise<{ success: boolean; message: string }> {
  try {
    await prisma.session.deleteMany({
      where: { token },
    });

    return {
      success: true,
      message: 'Logged out successfully',
    };
  } catch (error) {
    console.error('Logout error:', error);
    return {
      success: false,
      message: 'Logout failed',
    };
  }
}

// =============================================================================
// PASSWORD RESET
// =============================================================================

export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an account exists, a reset code has been sent.',
      };
    }

    await sendEmailOTP(user.id, user.email, OTPType.PASSWORD_RESET);

    return {
      success: true,
      message: 'If an account exists, a reset code has been sent.',
    };
  } catch (error) {
    console.error('Password reset request error:', error);
    return {
      success: false,
      message: 'Failed to process request. Please try again.',
    };
  }
}

export async function resetPassword(
  email: string,
  code: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid reset code',
      };
    }

    // Verify OTP
    const verification = await verifyOTP(user.id, code, OTPType.PASSWORD_RESET);
    if (!verification.success) {
      return verification;
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Invalidate all sessions
    await prisma.session.deleteMany({
      where: { userId: user.id },
    });

    return {
      success: true,
      message: 'Password reset successful. Please login with your new password.',
    };
  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'Failed to reset password. Please try again.',
    };
  }
}

// =============================================================================
// EMAIL VERIFICATION (UNAUTHENTICATED)
// =============================================================================

export async function verifyEmailWithCode(
  email: string,
  code: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return {
        success: false,
        message: 'Invalid verification code',
      };
    }

    if (user.emailVerified) {
      return {
        success: false,
        message: 'Email already verified',
      };
    }

    // Verify OTP
    const verification = await verifyOTP(user.id, code, OTPType.EMAIL_VERIFICATION);
    if (!verification.success) {
      return verification;
    }

    // Update user status
    await prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE' },
    });

    return {
      success: true,
      message: 'Email verified successfully. You can now login.',
    };
  } catch (error) {
    console.error('Email verification error:', error);
    return {
      success: false,
      message: 'Verification failed. Please try again.',
    };
  }
}

export async function resendVerificationEmail(
  email: string
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return {
        success: true,
        message: 'If an account exists, a verification code has been sent.',
      };
    }

    if (user.emailVerified) {
      return {
        success: false,
        message: 'Email already verified',
      };
    }

    await sendEmailOTP(user.id, user.email, OTPType.EMAIL_VERIFICATION);

    return {
      success: true,
      message: 'Verification code sent to your email.',
    };
  } catch (error) {
    console.error('Resend verification error:', error);
    return {
      success: false,
      message: 'Failed to send verification code. Please try again.',
    };
  }
}
