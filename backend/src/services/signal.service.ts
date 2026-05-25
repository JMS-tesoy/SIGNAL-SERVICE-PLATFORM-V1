// =============================================================================
// SIGNAL SERVICE - Trade Signal Processing
// =============================================================================

import prisma from '../config/database.js';
import { checkSignalLimit } from './subscription.service.js';
import { SignalAction, TradeType, SignalStatus, ExecutionStatus } from '@prisma/client';

// =============================================================================
// TYPES
// =============================================================================

interface IncomingSignal {
  action: string;
  symbol: string;
  type: string;
  volume: number;
  price: number;
  sl?: number;
  tp?: number;
  ticket?: number;
  magic?: number;
  comment?: string;
  accountId: string;
}

interface SignalResult {
  success: boolean;
  message: string;
  signalId?: string;
}

interface PendingSignalsResult {
  success: boolean;
  signals: any[];
  message?: string;
}

// =============================================================================
// RECEIVE SIGNAL FROM SENDER EA
// =============================================================================

export async function receiveSignal(
  providerId: string,
  signal: IncomingSignal
): Promise<SignalResult> {
  try {
    const mt5Account = await prisma.mT5Account.findFirst({
      where: {
        userId: providerId,
        accountId: signal.accountId,
        accountType: 'MASTER',
      },
    });

    if (!mt5Account) {
      return { success: false, message: 'Master account not found' };
    }

    const newSignal = await prisma.signal.create({
      data: {
        providerId,
        mt5AccountId: mt5Account.id,
        action: signal.action.toUpperCase() as SignalAction,
        symbol: signal.symbol,
        type: signal.type.toUpperCase() as TradeType,
        volume: signal.volume,
        price: signal.price,
        sl: signal.sl || null,
        tp: signal.tp || null,
        masterTicket: signal.ticket ? BigInt(signal.ticket) : null,
        magic: signal.magic || null,
        comment: signal.comment || null,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 120 * 1000), // 2 minutes expiry
      },
    });

    await createExecutionsForSubscribers(newSignal.id, providerId);

    return { success: true, message: 'Signal received', signalId: newSignal.id };
  } catch (error) {
    console.error('Receive signal error:', error);
    return { success: false, message: 'Failed to process signal' };
  }
}

// =============================================================================
// CREATE EXECUTIONS FOR SUBSCRIBERS
// =============================================================================

async function createExecutionsForSubscribers(signalId: string, providerId: string): Promise<void> {
  const subscribers = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      user: {
        status: 'ACTIVE',
        // Provider exclusion removed for testing - admin can receive own signals
        // id: { not: providerId },
        mt5Accounts: { some: { accountType: 'SLAVE' } },
      },
    },
    include: {
      user: {
        include: {
          mt5Accounts: { where: { accountType: 'SLAVE' } },
        },
      },
      tier: true,
    },
  });

  const executions = subscribers.flatMap((sub) =>
    sub.user.mt5Accounts.map((account) => ({
      signalId,
      userId: sub.user.id,
      mt5AccountId: account.id,
      status: 'PENDING' as ExecutionStatus,
    }))
  );

  if (executions.length > 0) {
    await prisma.signalExecution.createMany({ data: executions, skipDuplicates: true });
  }
}

// =============================================================================
// GET PENDING SIGNALS FOR RECEIVER EA
// =============================================================================

export async function getPendingSignals(
  userId: string,
  accountId: string
): Promise<PendingSignalsResult> {
  try {
    // BYPASSED FOR TESTING - was: checkSignalLimit(userId)
    // const limitCheck = await checkSignalLimit(userId);
    // if (!limitCheck.allowed) {
    //   return { success: true, signals: [], message: 'Daily signal limit reached' };
    // }

    const mt5Account = await prisma.mT5Account.findFirst({
      where: { userId, accountId, accountType: 'SLAVE' },
    });

    if (!mt5Account) {
      return { success: false, signals: [], message: 'Slave account not found' };
    }

    // Update SLAVE account connection status when polling
    await prisma.mT5Account.update({
      where: { id: mt5Account.id },
      data: {
        isConnected: true,
        lastHeartbeat: new Date(),
      },
    });

    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { tier: true },
    });

    const signalDelay = 0; // Bypassed for testing - was: subscription?.tier.signalDelay || 0
    const delayedTime = new Date(Date.now() - signalDelay * 1000);

    const executions = await prisma.signalExecution.findMany({
      where: {
        userId,
        mt5AccountId: mt5Account.id,
        status: 'PENDING',
        signal: {
          status: { in: ['PENDING', 'ACTIVE'] },
          expiresAt: { gt: new Date() },
          createdAt: { lte: delayedTime },
        },
      },
      include: { signal: true },
      orderBy: { receivedAt: 'asc' },
      take: 10,
    });

    const signals = executions.map((exec) => ({
      signal_id: exec.id,
      action: exec.signal.action,
      symbol: exec.signal.symbol,
      type: exec.signal.type,
      volume: Number(exec.signal.volume),
      price: Number(exec.signal.price),
      sl: exec.signal.sl ? Number(exec.signal.sl) : 0,
      tp: exec.signal.tp ? Number(exec.signal.tp) : 0,
      ticket: exec.signal.masterTicket ? Number(exec.signal.masterTicket) : 0,
      magic: exec.signal.magic || 0,
      timestamp_utc: exec.signal.createdAt.toISOString(),
    }));

    return { success: true, signals };
  } catch (error) {
    console.error('Get pending signals error:', error);
    return { success: false, signals: [], message: 'Failed to fetch signals' };
  }
}

// =============================================================================
// ACKNOWLEDGE SIGNAL EXECUTION (IDEMPOTENT)
// =============================================================================

const TERMINAL_STATUSES: ExecutionStatus[] = ['EXECUTED', 'FAILED', 'EXPIRED', 'SKIPPED'];

export async function acknowledgeExecution(
  executionId: string,
  userId: string,
  status: string,
  details?: {
    executedVolume?: number;
    executedPrice?: number;
    slippage?: number;
    slaveTicket?: number;
    errorCode?: number;
    errorMessage?: string;
  },
  mt5AccountId?: string
): Promise<SignalResult> {
  try {
    // Check current execution state first (idempotency check)
    const existing = await prisma.signalExecution.findFirst({
      where: { id: executionId, userId, ...(mt5AccountId ? { mt5AccountId } : {}) },
    });

    if (!existing) {
      return { success: false, message: 'Execution not found' };
    }

    // If already in a terminal state, return success (idempotent)
    if (TERMINAL_STATUSES.includes(existing.status)) {
      return {
        success: true,
        message: `Already acknowledged as ${existing.status}`
      };
    }

    // Parse incoming status
    let execStatus: ExecutionStatus;
    if (status.startsWith('EXECUTED')) execStatus = 'EXECUTED';
    else if (status.startsWith('FAILED')) execStatus = 'FAILED';
    else if (status === 'EXPIRED') execStatus = 'EXPIRED';
    else if (status.startsWith('REJECTED') || status.startsWith('SKIPPED')) execStatus = 'SKIPPED';
    else execStatus = 'PENDING';

    // Use conditional update to prevent race conditions
    const result = await prisma.signalExecution.updateMany({
      where: {
        id: executionId,
        userId,
        ...(mt5AccountId ? { mt5AccountId } : {}),
        status: 'PENDING', // Only update if still PENDING
      },
      data: {
        status: execStatus,
        executedAt: execStatus === 'EXECUTED' ? new Date() : null,
        acknowledgedAt: new Date(),
        executedVolume: details?.executedVolume,
        executedPrice: details?.executedPrice,
        slippage: details?.slippage,
        slaveTicket: details?.slaveTicket ? BigInt(details.slaveTicket) : null,
        errorCode: details?.errorCode,
        errorMessage: details?.errorMessage || (status.includes(':') ? status.split(':')[1] : null),
      },
    });

    // If no rows updated, another request already processed it
    if (result.count === 0) {
      const current = await prisma.signalExecution.findFirst({
        where: { id: executionId, userId, ...(mt5AccountId ? { mt5AccountId } : {}) },
        select: { status: true },
      });
      return {
        success: true,
        message: `Already acknowledged as ${current?.status || 'UNKNOWN'}`
      };
    }

    return { success: true, message: 'Execution acknowledged' };
  } catch (error) {
    console.error('Acknowledge execution error:', error);
    return { success: false, message: 'Failed to acknowledge execution' };
  }
}

// =============================================================================
// UPDATE HEARTBEAT
// =============================================================================

export async function updateHeartbeat(
  userId: string,
  accountId: string,
  data: { balance?: number; equity?: number; profit?: number }
): Promise<SignalResult> {
  try {
    // Get the MT5 account first (need the id for snapshot)
    const mt5Account = await prisma.mT5Account.findFirst({
      where: { userId, accountId },
    });

    if (!mt5Account) {
      return { success: false, message: 'Account not found' };
    }

    // Update the MT5Account with current values
    await prisma.mT5Account.update({
      where: { id: mt5Account.id },
      data: {
        isConnected: true,
        lastHeartbeat: new Date(),
        balance: data.balance,
        equity: data.equity,
        profit: data.profit,
      },
    });

    // Capture daily snapshot if we have balance/equity data
    if (data.balance !== undefined && data.equity !== undefined) {
      await captureBalanceSnapshot(
        mt5Account.id,
        data.balance,
        data.equity,
        data.profit || 0
      );
    }

    return { success: true, message: 'Heartbeat updated' };
  } catch (error) {
    console.error('Heartbeat update error:', error);
    return { success: false, message: 'Failed to update heartbeat' };
  }
}

// =============================================================================
// CAPTURE BALANCE SNAPSHOT (Daily)
// =============================================================================

async function captureBalanceSnapshot(
  mt5AccountId: string,
  balance: number,
  equity: number,
  profit: number
): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize to midnight

  try {
    // Get the latest snapshot for this account to determine peak equity
    const latestSnapshot = await prisma.accountSnapshot.findFirst({
      where: { mt5AccountId },
      orderBy: { snapshotDate: 'desc' },
    });

    // Calculate peak equity (highest seen so far)
    const currentPeakEquity = latestSnapshot?.peakEquity
      ? Math.max(Number(latestSnapshot.peakEquity), equity)
      : equity;

    // Upsert today's snapshot (only one per day)
    await prisma.accountSnapshot.upsert({
      where: {
        mt5AccountId_snapshotDate: {
          mt5AccountId,
          snapshotDate: today,
        },
      },
      create: {
        mt5AccountId,
        balance,
        equity,
        profit,
        peakEquity: currentPeakEquity,
        snapshotDate: today,
      },
      update: {
        balance,
        equity,
        profit,
        peakEquity: currentPeakEquity,
      },
    });
  } catch (error) {
    // Log but don't fail heartbeat if snapshot fails
    console.error('Balance snapshot capture error:', error);
  }
}

// =============================================================================
// GET SIGNAL HISTORY
// =============================================================================

export async function getSignalHistory(
  userId: string,
  options: { limit?: number; offset?: number; symbol?: string; startDate?: Date; endDate?: Date } = {}
) {
  const { limit = 50, offset = 0, symbol, startDate, endDate } = options;

  const where: any = {
    OR: [{ providerId: userId }, { executions: { some: { userId } } }],
  };

  if (symbol) where.symbol = symbol;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [signals, total] = await Promise.all([
    prisma.signal.findMany({
      where,
      include: {
        executions: { where: { userId } },
        provider: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    }),
    prisma.signal.count({ where }),
  ]);

  return { signals, total, limit, offset };
}

// =============================================================================
// GET SIGNAL STATISTICS
// =============================================================================

export async function getSignalStatistics(userId: string, period: 'day' | 'week' | 'month' | 'all' = 'month') {
  const now = new Date();
  let startDate: Date;

  switch (period) {
    case 'day': startDate = new Date(now.setHours(0, 0, 0, 0)); break;
    case 'week': startDate = new Date(now.setDate(now.getDate() - 7)); break;
    case 'month': startDate = new Date(now.setMonth(now.getMonth() - 1)); break;
    case 'all': startDate = new Date(0); break;
  }

  const executions = await prisma.signalExecution.findMany({
    where: { userId, receivedAt: { gte: startDate } },
    include: { signal: true },
  });

  const stats = {
    totalSignals: executions.length,
    executed: executions.filter((e) => e.status === 'EXECUTED').length,
    failed: executions.filter((e) => e.status === 'FAILED').length,
    skipped: executions.filter((e) => e.status === 'SKIPPED').length,
    expired: executions.filter((e) => e.status === 'EXPIRED').length,
    bySymbol: {} as Record<string, number>,
    byAction: { OPEN: 0, CLOSE: 0, MODIFY: 0 },
  };

  executions.forEach((exec) => {
    stats.bySymbol[exec.signal.symbol] = (stats.bySymbol[exec.signal.symbol] || 0) + 1;
    stats.byAction[exec.signal.action]++;
  });

  return stats;
}

// =============================================================================
// GET PERFORMANCE DATA (for Dashboard Chart)
// =============================================================================

interface PerformanceDataPoint {
  date: string;
  growth: number;
  drawdown: number;
}

export async function getPerformanceData(
  userId: string,
  period: '7D' | '30D' | '90D' = '30D'
): Promise<{ success: boolean; data: PerformanceDataPoint[]; message?: string }> {
  try {
    // Calculate start date based on period
    const now = new Date();
    const days = period === '7D' ? 7 : period === '30D' ? 30 : 90;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Get all MT5 accounts for this user
    const mt5Accounts = await prisma.mT5Account.findMany({
      where: { userId },
      select: { id: true },
    });

    if (mt5Accounts.length === 0) {
      return { success: true, data: [], message: 'No MT5 accounts found' };
    }

    const accountIds = mt5Accounts.map((a) => a.id);

    // Get all snapshots for user's accounts in the period
    const snapshots = await prisma.accountSnapshot.findMany({
      where: {
        mt5AccountId: { in: accountIds },
        snapshotDate: { gte: startDate },
      },
      orderBy: { snapshotDate: 'asc' },
    });

    if (snapshots.length === 0) {
      return { success: true, data: [], message: 'No performance data available' };
    }

    // Get the initial balance (first snapshot or oldest available)
    const initialSnapshot = await prisma.accountSnapshot.findFirst({
      where: { mt5AccountId: { in: accountIds } },
      orderBy: { snapshotDate: 'asc' },
    });

    const initialBalance = initialSnapshot ? Number(initialSnapshot.balance) : 0;

    // Group snapshots by date and aggregate across all accounts
    const dateMap = new Map<string, { totalBalance: number; totalEquity: number; peakEquity: number }>();

    for (const snapshot of snapshots) {
      const dateKey = snapshot.snapshotDate.toISOString().split('T')[0];
      const existing = dateMap.get(dateKey);

      if (existing) {
        existing.totalBalance += Number(snapshot.balance);
        existing.totalEquity += Number(snapshot.equity);
        existing.peakEquity = Math.max(existing.peakEquity, Number(snapshot.peakEquity));
      } else {
        dateMap.set(dateKey, {
          totalBalance: Number(snapshot.balance),
          totalEquity: Number(snapshot.equity),
          peakEquity: Number(snapshot.peakEquity),
        });
      }
    }

    // Calculate performance metrics
    const data: PerformanceDataPoint[] = [];
    let runningPeakEquity = initialBalance;

    for (const [dateKey, values] of dateMap) {
      // Update running peak equity
      runningPeakEquity = Math.max(runningPeakEquity, values.totalEquity);

      // Growth: ((current - initial) / initial) * 100
      const growth = initialBalance > 0
        ? ((values.totalBalance - initialBalance) / initialBalance) * 100
        : 0;

      // Drawdown: ((peak - current) / peak) * 100 (always negative or zero)
      const drawdown = runningPeakEquity > 0
        ? -((runningPeakEquity - values.totalEquity) / runningPeakEquity) * 100
        : 0;

      data.push({
        date: new Date(dateKey).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        growth: Math.round(growth * 100) / 100,
        drawdown: Math.round(drawdown * 100) / 100,
      });
    }

    return { success: true, data };
  } catch (error) {
    console.error('Get performance data error:', error);
    return { success: false, data: [], message: 'Failed to fetch performance data' };
  }
}

// =============================================================================
// CLEANUP EXPIRED SIGNALS
// =============================================================================

export async function cleanupExpiredSignals(): Promise<number> {
  const result = await prisma.signal.updateMany({
    where: { status: { in: ['PENDING', 'ACTIVE'] }, expiresAt: { lt: new Date() } },
    data: { status: 'EXPIRED' },
  });

  await prisma.signalExecution.updateMany({
    where: { status: 'PENDING', signal: { status: 'EXPIRED' } },
    data: { status: 'EXPIRED' },
  });

  return result.count;
}
