// =============================================================================
// EMAIL SERVICE - Resend Integration
// =============================================================================

import { sendEmail as sendTransactionalEmail } from '../lib/email/send-email.js';
import { emailSenders } from '../lib/email/senders.js';
import { welcomeTemplate, welcomeText } from '../lib/email/templates/welcome.js';

// =============================================================================
// TYPES
// =============================================================================

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string | string[];
}

// =============================================================================
// SEND EMAIL
// =============================================================================

export async function sendEmail(options: EmailOptions): Promise<void> {
  if (!process.env.RESEND_API_KEY && process.env.NODE_ENV !== 'production') {
    console.log(`[DEV MODE] Email would be sent to ${options.to}: ${options.subject}`);
    return;
  }

  const result = await sendTransactionalEmail({
    to: options.to,
    from: options.from || emailSenders.app,
    subject: options.subject,
    html: options.html,
    text: options.text,
    replyTo: options.replyTo,
  });

  if (!result.success) {
    console.error('Failed to send email:', result.error);
    throw new Error('Failed to send email');
  }

  console.log(`Email sent successfully to ${options.to}`);
}

// =============================================================================
// EMAIL TEMPLATES
// =============================================================================

export const emailTemplates = {
  // Welcome email after registration
  welcome: (_name: string) => {
    const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;

    return {
      subject: 'Welcome to Signal Service',
      html: welcomeTemplate({ dashboardUrl }),
      text: welcomeText({ dashboardUrl }),
    };
  },

  // Subscription confirmation
  subscriptionConfirmed: (tierName: string, periodEnd: Date) => ({
    subject: `Subscription Confirmed - ${tierName} Plan`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #0ea5e9; margin: 0;">🎉 Subscription Confirmed!</h1>
        </div>
        
        <p>Great news! Your <strong style="color: #22c55e;">${tierName}</strong> subscription is now active.</p>
        
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Plan:</strong> ${tierName}</p>
          <p style="margin: 10px 0 0 0;"><strong>Valid until:</strong> ${periodEnd.toLocaleDateString()}</p>
        </div>
        
        <p>You now have access to all ${tierName} features. Happy trading!</p>
      </div>
    `,
  }),

  // Payment receipt
  paymentReceipt: (amount: number, currency: string, invoiceId: string) => ({
    subject: `Payment Receipt - ${currency} ${amount.toFixed(2)}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <h2 style="color: #22c55e;">Payment Received ✓</h2>
        
        <div style="background: #1e293b; padding: 20px; border-radius: 12px; margin: 20px 0;">
          <table style="width: 100%; color: #f1f5f9;">
            <tr>
              <td style="padding: 8px 0;">Amount:</td>
              <td style="text-align: right; font-weight: bold;">${currency} ${amount.toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Invoice ID:</td>
              <td style="text-align: right;">${invoiceId}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0;">Date:</td>
              <td style="text-align: right;">${new Date().toLocaleDateString()}</td>
            </tr>
          </table>
        </div>
        
        <p style="color: #64748b; font-size: 14px;">Thank you for your payment!</p>
      </div>
    `,
  }),

  // Subscription expiring soon
  subscriptionExpiring: (tierName: string, daysLeft: number) => ({
    subject: `Subscription Expiring Soon - ${daysLeft} Days Left`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <h2 style="color: #f59e0b;">⚠️ Subscription Expiring</h2>
        
        <p>Your <strong>${tierName}</strong> subscription will expire in <strong style="color: #f59e0b;">${daysLeft} days</strong>.</p>
        
        <p>To continue receiving trading signals without interruption, please renew your subscription.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/dashboard/subscription" 
             style="background: #0ea5e9; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Renew Now
          </a>
        </div>
      </div>
    `,
  }),

  // Monthly report
  monthlyReport: (month: string, stats: {
    totalSignals: number;
    executedSignals: number;
    winRate: number;
    netProfit: number;
  }) => ({
    subject: `Monthly Trading Report - ${month}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px; border-radius: 16px;">
        <h2 style="color: #0ea5e9;">📊 Monthly Report - ${month}</h2>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0;">
          <div style="background: #1e293b; padding: 20px; border-radius: 12px; text-align: center;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">Total Signals</p>
            <p style="color: #0ea5e9; font-size: 28px; font-weight: bold; margin: 5px 0;">${stats.totalSignals}</p>
          </div>
          <div style="background: #1e293b; padding: 20px; border-radius: 12px; text-align: center;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">Executed</p>
            <p style="color: #22c55e; font-size: 28px; font-weight: bold; margin: 5px 0;">${stats.executedSignals}</p>
          </div>
          <div style="background: #1e293b; padding: 20px; border-radius: 12px; text-align: center;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">Win Rate</p>
            <p style="color: #a855f7; font-size: 28px; font-weight: bold; margin: 5px 0;">${stats.winRate}%</p>
          </div>
          <div style="background: #1e293b; padding: 20px; border-radius: 12px; text-align: center;">
            <p style="color: #64748b; margin: 0; font-size: 14px;">Net Profit</p>
            <p style="${stats.netProfit >= 0 ? 'color: #22c55e;' : 'color: #ef4444;'} font-size: 28px; font-weight: bold; margin: 5px 0;">
              ${stats.netProfit >= 0 ? '+' : ''}$${stats.netProfit.toFixed(2)}
            </p>
          </div>
        </div>
        
        <p style="color: #64748b; font-size: 14px; text-align: center;">
          View detailed report in your dashboard
        </p>
      </div>
    `,
  }),
};
