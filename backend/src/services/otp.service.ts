// =============================================================================
// OTP SERVICE - Email, SMS, and TOTP Authentication
// =============================================================================

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import prisma from '../config/database.js';
import { sendEmail } from './email.service.js';
import { sendSMS } from './sms.service.js';
import { OTPType, OTPMethod } from '@prisma/client';

// Configure TOTP
authenticator.options = {
  digits: 6,
  step: 30,
  window: 1,
};

// =============================================================================
// TYPES
// =============================================================================

interface OTPGenerateResult {
  success: boolean;
  message: string;
  expiresAt?: Date;
}

interface OTPVerifyResult {
  success: boolean;
  message: string;
  userId?: string;
}

interface TOTPSetupResult {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

// =============================================================================
// GENERATE 6-DIGIT OTP CODE
// =============================================================================

function generateOTPCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

// =============================================================================
// SEND OTP VIA EMAIL
// =============================================================================

export async function sendEmailOTP(
  userId: string,
  email: string,
  type: OTPType
): Promise<OTPGenerateResult> {
  try {
    // Invalidate any existing OTPs of this type
    await prisma.oTPToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate new OTP
    const code = generateOTPCode();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP in database
    await prisma.oTPToken.create({
      data: {
        userId,
        code,
        type,
        method: OTPMethod.EMAIL,
        expiresAt,
      },
    });

    // Email templates based on type
    const templates: Record<OTPType, { subject: string; body: string }> = {
      EMAIL_VERIFICATION: {
        subject: 'Verify Your Email - Signal Service',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #0ea5e9;">Email Verification</h2>
            <p>Your verification code is:</p>
            <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0f172a;">${code}</span>
            </div>
            <p>This code expires in ${expiryMinutes} minutes.</p>
            <p style="color: #64748b; font-size: 14px;">If you didn't request this, please ignore this email.</p>
          </div>
        `,
      },
      PASSWORD_RESET: {
        subject: 'Password Reset - Signal Service',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Password Reset Request</h2>
            <p>Your password reset code is:</p>
            <div style="background: #fef2f2; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #991b1b;">${code}</span>
            </div>
            <p>This code expires in ${expiryMinutes} minutes.</p>
            <p style="color: #64748b; font-size: 14px;">If you didn't request this, please secure your account immediately.</p>
          </div>
        `,
      },
      TWO_FACTOR_LOGIN: {
        subject: 'Login Verification - Signal Service',
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #8b5cf6;">Two-Factor Authentication</h2>
            <p>Your login verification code is:</p>
            <div style="background: #f5f3ff; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #5b21b6;">${code}</span>
            </div>
            <p>This code expires in ${expiryMinutes} minutes.</p>
            <p style="color: #64748b; font-size: 14px;">If this wasn't you, please change your password immediately.</p>
          </div>
        `,
      },
      PHONE_VERIFICATION: {
        subject: 'Phone Verification - Signal Service',
        body: `Your verification code is: ${code}`,
      },
    };

    const template = templates[type];

    // Log OTP code for development/testing
    console.log('\n========================================');
    console.log(`📧 OTP CODE for ${email}`);
    console.log(`   Type: ${type}`);
    console.log(`   Code: ${code}`);
    console.log(`   Expires: ${expiresAt.toLocaleString()}`);
    console.log('========================================\n');

    // Send email
    try {
      await sendEmail({
        to: email,
        subject: template.subject,
        html: template.body,
      });
    } catch (emailError) {
      console.error('Email sending failed, but OTP was generated. Use the code from console above.');
    }

    return {
      success: true,
      message: 'OTP sent to your email',
      expiresAt,
    };
  } catch (error) {
    console.error('Failed to send email OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.',
    };
  }
}

// =============================================================================
// SEND OTP VIA SMS
// =============================================================================

export async function sendSMSOTP(
  userId: string,
  phone: string,
  type: OTPType
): Promise<OTPGenerateResult> {
  try {
    // Invalidate existing OTPs
    await prisma.oTPToken.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    // Generate new OTP
    const code = generateOTPCode();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP
    await prisma.oTPToken.create({
      data: {
        userId,
        code,
        type,
        method: OTPMethod.SMS,
        expiresAt,
      },
    });

    // SMS messages based on type
    const messages: Record<OTPType, string> = {
      EMAIL_VERIFICATION: `Signal Service: Your verification code is ${code}. Expires in ${expiryMinutes} min.`,
      PASSWORD_RESET: `Signal Service: Your password reset code is ${code}. Expires in ${expiryMinutes} min.`,
      TWO_FACTOR_LOGIN: `Signal Service: Your login code is ${code}. Expires in ${expiryMinutes} min.`,
      PHONE_VERIFICATION: `Signal Service: Your phone verification code is ${code}. Expires in ${expiryMinutes} min.`,
    };

    // Send SMS
    await sendSMS({
      to: phone,
      body: messages[type],
    });

    return {
      success: true,
      message: 'OTP sent to your phone',
      expiresAt,
    };
  } catch (error) {
    console.error('Failed to send SMS OTP:', error);
    return {
      success: false,
      message: 'Failed to send OTP. Please try again.',
    };
  }
}

// =============================================================================
// VERIFY OTP CODE
// =============================================================================

export async function verifyOTP(
  userId: string,
  code: string,
  type: OTPType
): Promise<OTPVerifyResult> {
  const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '3');

  try {
    // Find valid OTP
    const otpToken = await prisma.oTPToken.findFirst({
      where: {
        userId,
        type,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!otpToken) {
      return {
        success: false,
        message: 'No valid OTP found. Please request a new one.',
      };
    }

    // Check attempts
    if (otpToken.attempts >= maxAttempts) {
      await prisma.oTPToken.update({
        where: { id: otpToken.id },
        data: { usedAt: new Date() },
      });
      return {
        success: false,
        message: 'Too many attempts. Please request a new OTP.',
      };
    }

    // Verify code
    if (otpToken.code !== code) {
      await prisma.oTPToken.update({
        where: { id: otpToken.id },
        data: { attempts: otpToken.attempts + 1 },
      });
      return {
        success: false,
        message: `Invalid code. ${maxAttempts - otpToken.attempts - 1} attempts remaining.`,
      };
    }

    // Mark as used
    await prisma.oTPToken.update({
      where: { id: otpToken.id },
      data: { usedAt: new Date() },
    });

    // If email verification, update user
    if (type === 'EMAIL_VERIFICATION') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          emailVerifiedAt: new Date(),
        },
      });
    }

    return {
      success: true,
      message: 'OTP verified successfully',
      userId,
    };
  } catch (error) {
    console.error('Failed to verify OTP:', error);
    return {
      success: false,
      message: 'Verification failed. Please try again.',
    };
  }
}

// =============================================================================
// TOTP (Authenticator App) SETUP
// =============================================================================

export async function setupTOTP(userId: string, email: string): Promise<TOTPSetupResult> {
  // Generate secret
  const secret = authenticator.generateSecret();
  
  // Create otpauth URL for QR code
  const serviceName = 'SignalService';
  const otpauthUrl = authenticator.keyuri(email, serviceName, secret);
  
  // Generate QR code
  const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);
  
  // Store secret (encrypted in production)
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorSecret: secret,
      twoFactorMethod: 'TOTP',
    },
  });

  return {
    secret,
    qrCodeUrl,
    manualEntryKey: secret,
  };
}

// =============================================================================
// VERIFY TOTP CODE
// =============================================================================

export async function verifyTOTP(userId: string, code: string): Promise<OTPVerifyResult> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) {
      return {
        success: false,
        message: 'Two-factor authentication not set up',
      };
    }

    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorSecret,
    });

    if (!isValid) {
      return {
        success: false,
        message: 'Invalid authentication code',
      };
    }

    return {
      success: true,
      message: 'Authentication successful',
      userId,
    };
  } catch (error) {
    console.error('Failed to verify TOTP:', error);
    return {
      success: false,
      message: 'Authentication failed. Please try again.',
    };
  }
}

// =============================================================================
// ENABLE 2FA
// =============================================================================

export async function enableTwoFactor(
  userId: string,
  code: string
): Promise<{ success: boolean; message: string; backupCodes?: string[] }> {
  // Verify the code first
  const verification = await verifyTOTP(userId, code);
  
  if (!verification.success) {
    return verification;
  }

  // Generate backup codes
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  // Enable 2FA
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: true,
    },
  });

  return {
    success: true,
    message: 'Two-factor authentication enabled',
    backupCodes,
  };
}

// =============================================================================
// DISABLE 2FA
// =============================================================================

export async function disableTwoFactor(userId: string): Promise<{ success: boolean; message: string }> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
    },
  });

  return {
    success: true,
    message: 'Two-factor authentication disabled',
  };
}
