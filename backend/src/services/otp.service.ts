// =============================================================================
// OTP SERVICE - Email, SMS, and TOTP Authentication
// =============================================================================

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { sendEmail } from './email.service.js';
import { sendSMS } from './sms.service.js';
import { OTPType, OTPMethod } from '@prisma/client';
import { emailSenders } from '../lib/email/senders.js';
import { otpTemplate, otpText } from '../lib/email/templates/otp.js';
import { otpRepository } from '../database/repositories/index.js';

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
    await otpRepository.invalidateUnusedOtpTokens(userId, type);

    // Generate new OTP
    const code = generateOTPCode();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP in database
    await otpRepository.createOtpToken({
      userId,
      code,
      type,
      method: OTPMethod.EMAIL,
      expiresAt,
    });

    // Email subjects based on type
    const templates: Record<OTPType, { subject: string }> = {
      EMAIL_VERIFICATION: {
        subject: 'Your verification code',
      },
      PASSWORD_RESET: {
        subject: 'Your verification code',
      },
      TWO_FACTOR_LOGIN: {
        subject: 'Your verification code',
      },
      PHONE_VERIFICATION: {
        subject: 'Your verification code',
      },
    };

    const template = templates[type];

    // Log OTP code only for local development/testing.
    if (process.env.NODE_ENV !== 'production') {
      console.log('\n========================================');
      console.log(`Email OTP CODE for ${email}`);
      console.log(`   Type: ${type}`);
      console.log(`   Code: ${code}`);
      console.log(`   Expires: ${expiresAt.toLocaleString()}`);
      console.log('========================================\n');
    }

    // Send email
    try {
      await sendEmail({
        to: email,
        from: emailSenders.auth,
        subject: template.subject,
        html: otpTemplate({ code }),
        text: `${otpText({ code })}\n\nThis code expires in ${expiryMinutes} minutes.`,
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
    await otpRepository.invalidateUnusedOtpTokens(userId, type);

    // Generate new OTP
    const code = generateOTPCode();
    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '10');
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // Store OTP
    await otpRepository.createOtpToken({
      userId,
      code,
      type,
      method: OTPMethod.SMS,
      expiresAt,
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
    const otpToken = await otpRepository.findLatestValidOtpToken(userId, type);

    if (!otpToken) {
      return {
        success: false,
        message: 'No valid OTP found. Please request a new one.',
      };
    }

    // Check attempts
    if (otpToken.attempts >= maxAttempts) {
      await otpRepository.markOtpTokenUsed(otpToken.id);
      return {
        success: false,
        message: 'Too many attempts. Please request a new OTP.',
      };
    }

    // Verify code
    if (otpToken.code !== code) {
      await otpRepository.incrementOtpTokenAttempts(
        otpToken.id,
        otpToken.attempts + 1
      );
      return {
        success: false,
        message: `Invalid code. ${maxAttempts - otpToken.attempts - 1} attempts remaining.`,
      };
    }

    // Mark as used
    await otpRepository.markOtpTokenUsed(otpToken.id);

    // If email verification, update user
    if (type === 'EMAIL_VERIFICATION') {
      await otpRepository.markUserEmailVerified(userId);
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
  await otpRepository.updateUserTotpSecret(userId, secret);

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
    const user = await otpRepository.findUserTotpSecretById(userId);

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
  await otpRepository.enableUserTwoFactor(userId);

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
  await otpRepository.disableUserTwoFactor(userId);

  return {
    success: true,
    message: 'Two-factor authentication disabled',
  };
}
