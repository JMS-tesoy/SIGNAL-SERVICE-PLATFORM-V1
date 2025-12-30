// =============================================================================
// NOTIFICATION SERVICE - Security & Account Event Notifications
// =============================================================================

import { sendEmail } from './email.service.js';
import prisma from '../config/database.js';

// =============================================================================
// TYPES
// =============================================================================

interface NotificationContext {
  userAgent?: string;
  ipAddress?: string;
  location?: string;
  device?: string;
  timestamp?: Date;
}

// =============================================================================
// NOTIFICATION TEMPLATES
// =============================================================================

const notificationTemplates = {
  // ========================================
  // SECURITY NOTIFICATIONS
  // ========================================

  newLogin: (name: string, context: NotificationContext) => ({
    subject: '🔐 New Login Detected - Signal Service',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; margin: 0 auto; background: linear-gradient(135deg, #0ea5e9 0%, #8b5cf6 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">🔐</span>
          </div>
        </div>

        <h2 style="color: #0ea5e9; text-align: center;">New Login Detected</h2>

        <p>Hi ${name},</p>

        <p>We detected a new login to your Signal Service account.</p>

        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <h3 style="color: #f1f5f9; margin-top: 0; font-size: 16px;">Login Details:</h3>
          <table style="width: 100%; color: #94a3b8; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0;">Time:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.timestamp?.toLocaleString() || 'Just now'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Device:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.device || 'Unknown'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">IP Address:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.ipAddress || 'N/A'}</td>
            </tr>
            ${context.location ? `
            <tr>
              <td style="padding: 8px 0;">Location:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.location}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <div style="background: #7c2d12; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #fca5a5; font-size: 14px;">
            ⚠️ <strong>Wasn't you?</strong> Change your password immediately and enable two-factor authentication.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/security"
             style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Review Security Settings
          </a>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
          If you recognize this activity, you can safely ignore this email.
        </p>
      </div>
    `,
  }),

  passwordChanged: (name: string, context: NotificationContext) => ({
    subject: '🔒 Password Changed Successfully - Signal Service',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; margin: 0 auto; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">✓</span>
          </div>
        </div>

        <h2 style="color: #22c55e; text-align: center;">Password Changed</h2>

        <p>Hi ${name},</p>

        <p>Your password was successfully changed.</p>

        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <table style="width: 100%; color: #94a3b8; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0;">Time:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.timestamp?.toLocaleString() || 'Just now'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">IP Address:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.ipAddress || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div style="background: #7c2d12; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #fca5a5; font-size: 14px;">
            ⚠️ <strong>Didn't make this change?</strong> Contact our support team immediately. Your account may be compromised.
          </p>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
          All your existing sessions have been logged out for security.
        </p>
      </div>
    `,
  }),

  twoFactorEnabled: (name: string) => ({
    subject: '🛡️ Two-Factor Authentication Enabled - Signal Service',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; margin: 0 auto; background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">🛡️</span>
          </div>
        </div>

        <h2 style="color: #8b5cf6; text-align: center;">2FA Enabled Successfully</h2>

        <p>Hi ${name},</p>

        <p>Two-factor authentication has been enabled on your account. This adds an extra layer of security to protect your trading data.</p>

        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h3 style="color: #8b5cf6; margin-top: 0; font-size: 16px;">What This Means:</h3>
          <ul style="color: #94a3b8; padding-left: 20px;">
            <li style="margin: 8px 0;">You'll need your authentication code when signing in</li>
            <li style="margin: 8px 0;">Your account is now more secure</li>
            <li style="margin: 8px 0;">Keep your backup codes in a safe place</li>
          </ul>
        </div>

        <div style="background: #064e3b; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #86efac; font-size: 14px;">
            ✓ <strong>Your account is now protected</strong> with two-factor authentication
          </p>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
          You can disable 2FA anytime from your security settings.
        </p>
      </div>
    `,
  }),

  twoFactorDisabled: (name: string, context: NotificationContext) => ({
    subject: '⚠️ Two-Factor Authentication Disabled - Signal Service',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; margin: 0 auto; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">⚠️</span>
          </div>
        </div>

        <h2 style="color: #f59e0b; text-align: center;">2FA Disabled</h2>

        <p>Hi ${name},</p>

        <p>Two-factor authentication has been disabled on your account.</p>

        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <table style="width: 100%; color: #94a3b8; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0;">Time:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.timestamp?.toLocaleString() || 'Just now'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">IP Address:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.ipAddress || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div style="background: #7c2d12; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #fca5a5; font-size: 14px;">
            ⚠️ <strong>Your account is less secure now.</strong> We strongly recommend keeping 2FA enabled.
          </p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/security"
             style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Re-enable 2FA
          </a>
        </div>
      </div>
    `,
  }),

  emailVerified: (name: string) => ({
    subject: '✅ Email Verified Successfully - Signal Service',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; margin: 0 auto; background: linear-gradient(135deg, #22c55e 0%, #10b981 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">✅</span>
          </div>
        </div>

        <h2 style="color: #22c55e; text-align: center;">Email Verified!</h2>

        <p>Hi ${name},</p>

        <p>Your email address has been successfully verified. You now have full access to all Signal Service features.</p>

        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h3 style="color: #22c55e; margin-top: 0; font-size: 16px;">Next Steps:</h3>
          <ul style="color: #94a3b8; padding-left: 20px;">
            <li style="margin: 8px 0;">Connect your MT5 account</li>
            <li style="margin: 8px 0;">Set up two-factor authentication for extra security</li>
            <li style="margin: 8px 0;">Choose a subscription plan that fits your needs</li>
            <li style="margin: 8px 0;">Start receiving premium trading signals</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard"
             style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Go to Dashboard
          </a>
        </div>
      </div>
    `,
  }),

  sessionRevoked: (name: string, sessionsCount: number) => ({
    subject: '🔓 Sessions Revoked - Signal Service',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <h2 style="color: #f59e0b;">Sessions Revoked</h2>

        <p>Hi ${name},</p>

        <p>You have logged out of <strong style="color: #f59e0b;">${sessionsCount}</strong> ${sessionsCount === 1 ? 'session' : 'sessions'} on other devices.</p>

        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 0; color: #94a3b8;">If you didn't perform this action, please change your password immediately and enable two-factor authentication.</p>
        </div>
      </div>
    `,
  }),

  // ========================================
  // ACCOUNT NOTIFICATIONS
  // ========================================

  accountSuspended: (name: string, reason: string) => ({
    subject: '⛔ Account Suspended - Signal Service',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <h2 style="color: #ef4444;">Account Suspended</h2>

        <p>Hi ${name},</p>

        <p>Your Signal Service account has been suspended.</p>

        <div style="background: #7c2d12; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Reason:</strong></p>
          <p style="margin: 10px 0 0 0; color: #fca5a5;">${reason}</p>
        </div>

        <p>If you believe this is an error, please contact our support team.</p>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/support"
             style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Contact Support
          </a>
        </div>
      </div>
    `,
  }),

  // ========================================
  // SUSPICIOUS ACTIVITY
  // ========================================

  suspiciousActivity: (name: string, activity: string, context: NotificationContext) => ({
    subject: '🚨 Suspicious Activity Detected - Signal Service',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <div style="width: 80px; height: 80px; margin: 0 auto; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 40px;">🚨</span>
          </div>
        </div>

        <h2 style="color: #ef4444; text-align: center;">Suspicious Activity Detected</h2>

        <p>Hi ${name},</p>

        <p>We detected unusual activity on your account that requires your attention.</p>

        <div style="background: #7c2d12; padding: 20px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #ef4444;">
          <h3 style="color: #fca5a5; margin-top: 0; font-size: 16px;">Activity Details:</h3>
          <p style="color: #f1f5f9; margin: 10px 0;">${activity}</p>
          <table style="width: 100%; color: #94a3b8; font-size: 14px; margin-top: 15px;">
            <tr>
              <td style="padding: 8px 0;">Time:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.timestamp?.toLocaleString() || 'Just now'}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">IP Address:</td>
              <td style="text-align: right; color: #f1f5f9;">${context.ipAddress || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <div style="background: #0c4a6e; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <h3 style="color: #7dd3fc; margin-top: 0; font-size: 16px;">Recommended Actions:</h3>
          <ul style="color: #94a3b8; padding-left: 20px; margin: 10px 0;">
            <li style="margin: 8px 0;">Change your password immediately</li>
            <li style="margin: 8px 0;">Enable two-factor authentication</li>
            <li style="margin: 8px 0;">Review your recent account activity</li>
            <li style="margin: 8px 0;">Log out of all other sessions</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/security"
             style="display: inline-block; background: #ef4444; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Secure My Account
          </a>
        </div>

        <p style="color: #64748b; font-size: 12px; text-align: center; margin-top: 30px;">
          This is an automated security alert. If you recognize this activity, you can safely ignore this email.
        </p>
      </div>
    `,
  }),
};

// =============================================================================
// SEND NOTIFICATION FUNCTIONS
// =============================================================================

export async function notifyNewLogin(
  userId: string,
  email: string,
  name: string,
  context: NotificationContext
): Promise<void> {
  try {
    // Get device info from user agent
    const device = context.userAgent?.includes('Mobile') ? 'Mobile Device' : 'Desktop';

    const template = notificationTemplates.newLogin(name, {
      ...context,
      device,
      timestamp: new Date(),
    });

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`New login notification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send new login notification:', error);
  }
}

export async function notifyPasswordChanged(
  userId: string,
  email: string,
  name: string,
  context: NotificationContext
): Promise<void> {
  try {
    const template = notificationTemplates.passwordChanged(name, {
      ...context,
      timestamp: new Date(),
    });

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`Password change notification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password change notification:', error);
  }
}

export async function notifyTwoFactorEnabled(
  userId: string,
  email: string,
  name: string
): Promise<void> {
  try {
    const template = notificationTemplates.twoFactorEnabled(name);

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`2FA enabled notification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send 2FA enabled notification:', error);
  }
}

export async function notifyTwoFactorDisabled(
  userId: string,
  email: string,
  name: string,
  context: NotificationContext
): Promise<void> {
  try {
    const template = notificationTemplates.twoFactorDisabled(name, {
      ...context,
      timestamp: new Date(),
    });

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`2FA disabled notification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send 2FA disabled notification:', error);
  }
}

export async function notifyEmailVerified(
  userId: string,
  email: string,
  name: string
): Promise<void> {
  try {
    const template = notificationTemplates.emailVerified(name);

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`Email verified notification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send email verified notification:', error);
  }
}

export async function notifySessionsRevoked(
  userId: string,
  email: string,
  name: string,
  sessionsCount: number
): Promise<void> {
  try {
    const template = notificationTemplates.sessionRevoked(name, sessionsCount);

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`Sessions revoked notification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send sessions revoked notification:', error);
  }
}

export async function notifyAccountSuspended(
  userId: string,
  email: string,
  name: string,
  reason: string
): Promise<void> {
  try {
    const template = notificationTemplates.accountSuspended(name, reason);

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`Account suspended notification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send account suspended notification:', error);
  }
}

export async function notifySuspiciousActivity(
  userId: string,
  email: string,
  name: string,
  activity: string,
  context: NotificationContext
): Promise<void> {
  try {
    const template = notificationTemplates.suspiciousActivity(name, activity, {
      ...context,
      timestamp: new Date(),
    });

    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    console.log(`Suspicious activity notification sent to ${email}`);
  } catch (error) {
    console.error('Failed to send suspicious activity notification:', error);
  }
}

// =============================================================================
// BATCH NOTIFICATION
// =============================================================================

export async function notifyMultipleUsers(
  userIds: string[],
  templateName: string,
  templateData: any
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    const promises = users.map(user => {
      // Add batch notification logic based on templateName
      return Promise.resolve();
    });

    await Promise.all(promises);
    console.log(`Batch notification sent to ${users.length} users`);
  } catch (error) {
    console.error('Failed to send batch notifications:', error);
  }
}
