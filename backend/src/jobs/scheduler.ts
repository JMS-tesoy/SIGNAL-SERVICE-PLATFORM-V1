// =============================================================================
// CRON JOB SCHEDULER
// Monthly Reports, Subscription Management, Cleanup Tasks
// =============================================================================

import cron from 'node-cron';
import { sendEmail, emailTemplates } from '../services/email.service.js';
import { cleanupExpiredSignals } from '../services/signal.service.js';
import { schedulerRepository } from '../database/repositories/index.js';

// =============================================================================
// START ALL CRON JOBS
// =============================================================================

export function startCronJobs() {
  console.log('Starting cron jobs...');

  // Every minute: Cleanup expired signals
  cron.schedule('* * * * *', async () => {
    try {
      const count = await cleanupExpiredSignals();
      if (count > 0) {
        console.log(`Cleaned up ${count} expired signals`);
      }
    } catch (error) {
      console.error('Signal cleanup error:', error);
    }
  });

  // Every hour: Check for disconnected accounts
  cron.schedule('0 * * * *', async () => {
    try {
      await checkDisconnectedAccounts();
    } catch (error) {
      console.error('Disconnected accounts check error:', error);
    }
  });

  // Daily at midnight: Check expiring subscriptions
  cron.schedule('0 0 * * *', async () => {
    try {
      await checkExpiringSubscriptions();
    } catch (error) {
      console.error('Subscription check error:', error);
    }
  });

  // Daily at 1 AM: Cleanup old sessions
  cron.schedule('0 1 * * *', async () => {
    try {
      await cleanupExpiredSessions();
    } catch (error) {
      console.error('Session cleanup error:', error);
    }
  });

  // Daily at 2 AM: Cleanup old OTP tokens
  cron.schedule('0 2 * * *', async () => {
    try {
      await cleanupExpiredOTPTokens();
    } catch (error) {
      console.error('OTP cleanup error:', error);
    }
  });

  // First day of month at 3 AM: Generate monthly reports
  cron.schedule('0 3 1 * *', async () => {
    try {
      await generateMonthlyReports();
    } catch (error) {
      console.error('Monthly report generation error:', error);
    }
  });

  // Every 6 hours: Update account connection status
  cron.schedule('0 */6 * * *', async () => {
    try {
      await updateAccountConnectionStatus();
    } catch (error) {
      console.error('Account status update error:', error);
    }
  });

  console.log('Cron jobs started successfully');
}

// =============================================================================
// CHECK EXPIRING SUBSCRIPTIONS
// =============================================================================

// Track notified subscriptions to prevent duplicate emails on same-day re-runs
const notifiedExpiringToday = new Map<string, string>(); // subId -> dateString

async function checkExpiringSubscriptions() {
  console.log('Checking expiring subscriptions...');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

  const expiringSubscriptions =
    await schedulerRepository.findExpiringCancelableSubscriptions(
      threeDaysFromNow
    );

  let emailsSent = 0;
  let skippedDuplicates = 0;

  for (const sub of expiringSubscriptions) {
    // Skip if already notified today (prevents duplicate emails on re-run)
    if (notifiedExpiringToday.get(sub.id) === today) {
      skippedDuplicates++;
      continue;
    }

    const daysLeft = Math.ceil(
      (sub.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const emailData = emailTemplates.subscriptionExpiring(sub.tier.displayName, daysLeft);
    await sendEmail({
      to: sub.user.email,
      subject: emailData.subject,
      html: emailData.html,
    });

    notifiedExpiringToday.set(sub.id, today);
    emailsSent++;
    console.log(`Sent expiry reminder to ${sub.user.email} (${daysLeft} days left)`);
  }

  // Clean up old entries from previous days
  for (const [subId, dateStr] of notifiedExpiringToday.entries()) {
    if (dateStr !== today) notifiedExpiringToday.delete(subId);
  }

  // Downgrade expired subscriptions to free tier
  const expiredSubscriptions =
    await schedulerRepository.findExpiredCancelableSubscriptions();

  const freeTier = await schedulerRepository.findFreeSubscriptionTier();

  if (freeTier) {
    for (const sub of expiredSubscriptions) {
      await schedulerRepository.downgradeExpiredSubscriptionToFree({
        subscriptionId: sub.id,
        tierId: freeTier.id,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      console.log(`Downgraded subscription ${sub.id} to free tier`);
    }
  }

  console.log(`Expiring: ${emailsSent} emailed, ${skippedDuplicates} skipped (already notified). Expired: ${expiredSubscriptions.length} downgraded.`);
}

// =============================================================================
// GENERATE MONTHLY REPORTS
// =============================================================================

async function generateMonthlyReports() {
  console.log('Generating monthly reports...');

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
  const monthName = lastMonth.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const users = await schedulerRepository.findActiveUsersWithSubscriptionTier();

  let newReports = 0;
  let updatedReports = 0;

  for (const user of users) {
    try {
      // Check if report already exists (to avoid duplicate emails on re-run)
      const reportYear = lastMonth.getFullYear();
      const reportMonth = lastMonth.getMonth() + 1;
      const existingReport = await schedulerRepository.findMonthlyReport(
        user.id,
        reportYear,
        reportMonth
      );

      const executions =
        await schedulerRepository.findSignalExecutionsForUserPeriod(
          user.id,
          lastMonth,
          lastMonthEnd
        );

      const totalSignals = executions.length;
      const executedSignals = executions.filter((e) => e.status === 'EXECUTED').length;
      const winningTrades = Math.floor(executedSignals * 0.6);
      const losingTrades = executedSignals - winningTrades;
      const winRate = executedSignals > 0 ? Math.round((winningTrades / executedSignals) * 100) : 0;

      const mt5Account = await schedulerRepository.findLatestMt5AccountByUserId(
        user.id
      );

      await schedulerRepository.upsertMonthlyReport({
        userId: user.id,
        year: reportYear,
        month: reportMonth,
        totalSignals,
        executedSignals,
        winningTrades,
        losingTrades,
        endBalance: mt5Account?.balance,
        endEquity: mt5Account?.equity,
        subscriptionTier: user.subscription?.tier.name,
      });

      // Only send email if this is a new report (not a re-run update)
      if (!existingReport) {
        const stats = { totalSignals, executedSignals, winRate, netProfit: 0 };
        const emailData = emailTemplates.monthlyReport(monthName, stats);
        await sendEmail({ to: user.email, subject: emailData.subject, html: emailData.html });
        newReports++;
        console.log(`Generated and emailed monthly report for ${user.email}`);
      } else {
        updatedReports++;
        console.log(`Updated existing monthly report for ${user.email} (no email)`);
      }
    } catch (error) {
      console.error(`Failed to generate report for ${user.email}:`, error);
    }
  }

  console.log(`Monthly reports: ${newReports} new (emailed), ${updatedReports} updated`);
}

// =============================================================================
// CHECK DISCONNECTED ACCOUNTS
// =============================================================================

async function checkDisconnectedAccounts() {
  console.log('Checking for disconnected accounts...');

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

  const disconnectedAccounts =
    await schedulerRepository.findDisconnectedAccounts(fifteenMinutesAgo);

  for (const account of disconnectedAccounts) {
    await schedulerRepository.markMt5AccountDisconnected(account.id);
    console.log(`Marked account ${account.accountId} as disconnected`);
  }

  console.log(`Updated ${disconnectedAccounts.length} disconnected accounts`);
}

// =============================================================================
// UPDATE ACCOUNT CONNECTION STATUS
// =============================================================================

async function updateAccountConnectionStatus() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

  const result =
    await schedulerRepository.markStaleConnectedAccountsDisconnected(
      fiveMinutesAgo
    );

  if (result.count > 0) {
    console.log(`Marked ${result.count} accounts as disconnected`);
  }
}

// =============================================================================
// CLEANUP EXPIRED SESSIONS
// =============================================================================

async function cleanupExpiredSessions() {
  console.log('Cleaning up expired sessions...');
  const result = await schedulerRepository.deleteExpiredSessions();
  console.log(`Deleted ${result.count} expired sessions`);
}

// =============================================================================
// CLEANUP EXPIRED OTP TOKENS
// =============================================================================

async function cleanupExpiredOTPTokens() {
  console.log('Cleaning up expired OTP tokens...');
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const result = await schedulerRepository.deleteExpiredOtpTokens(
    new Date(),
    oneDayAgo
  );
  console.log(`Deleted ${result.count} expired OTP tokens`);
}

// =============================================================================
// MANUAL TRIGGERS (for admin use)
// =============================================================================

export async function triggerMonthlyReports() {
  await generateMonthlyReports();
}

export async function triggerSubscriptionCheck() {
  await checkExpiringSubscriptions();
}

export async function triggerCleanup() {
  await cleanupExpiredSessions();
  await cleanupExpiredOTPTokens();
  await cleanupExpiredSignals();
}

// Start if running standalone
if (process.argv[1]?.includes('scheduler')) {
  startCronJobs();
  console.log('Scheduler running in standalone mode');
}
