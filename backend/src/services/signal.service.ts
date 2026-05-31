// =============================================================================
// SIGNAL SERVICE - Trade Signal Processing
// =============================================================================

import { checkSignalLimit } from './subscription.service.js';
import { Prisma, SignalAction, TradeType, ExecutionStatus } from '@prisma/client';
import { signalRepository } from '../database/repositories/index.js';

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
    const mt5Account = await signalRepository.findMasterAccountByUserAndAccountId(
      providerId,
      signal.accountId
    );

    if (!mt5Account) {
      return { success: false, message: 'Master account not found' };
    }

    const masterTicket = signal.ticket ? BigInt(signal.ticket) : null;

    if (masterTicket) {
      const existingSignal = await signalRepository.findSignalByMasterTicket({
        providerId,
        mt5AccountId: mt5Account.id,
        masterTicket,
      });

      if (existingSignal) {
        return {
          success: true,
          message: 'Signal already received',
          signalId: existingSignal.id,
        };
      }
    }

    const newSignal = await signalRepository.createSignal({
      providerId,
      mt5AccountId: mt5Account.id,
      action: signal.action.toUpperCase() as SignalAction,
      symbol: signal.symbol,
      type: signal.type.toUpperCase() as TradeType,
      volume: signal.volume,
      price: signal.price,
      sl: signal.sl || null,
      tp: signal.tp || null,
      masterTicket,
      magic: signal.magic || null,
      comment: signal.comment || null,
      expiresAt: new Date(Date.now() + 120 * 1000), // 2 minutes expiry
    });

    await signalRepository.createPendingExecutionsForActiveSubscriberSlaveAccounts(
      newSignal.id
    );

    return { success: true, message: 'Signal received', signalId: newSignal.id };
  } catch (error) {
    console.error('Receive signal error:', error);
    return { success: false, message: 'Failed to process signal' };
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

    const mt5Account = await signalRepository.findSlaveAccountByUserAndAccountId(
      userId,
      accountId
    );

    if (!mt5Account) {
      return { success: false, signals: [], message: 'Slave account not found' };
    }

    // Update SLAVE account connection status when polling
    await signalRepository.markAccountConnected(mt5Account.id);

    const subscription = await signalRepository.findUserSubscriptionWithTier(userId);
    void subscription;

    const signalDelay = 0; // Bypassed for testing - was: subscription?.tier.signalDelay || 0
    const delayedTime = new Date(Date.now() - signalDelay * 1000);

    const executions = await signalRepository.findPendingExecutionsForSlaveAccount(
      userId,
      mt5Account.id,
      delayedTime
    );

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
    const existing = await signalRepository.findExecutionByIdForUser(
      executionId,
      userId,
      mt5AccountId
    );

    if (!existing) {
      return { success: false, message: 'Execution not found' };
    }

    // If already in a terminal state, return success (idempotent)
    if (TERMINAL_STATUSES.includes(existing.status)) {
      await signalRepository.reconcileSignalStatusFromExecutions(existing.signalId);

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
    const result = await signalRepository.acknowledgePendingExecution({
      executionId,
      userId,
      status: execStatus,
      details: {
        ...details,
        errorMessage:
          details?.errorMessage ||
          (status.includes(':') ? status.split(':')[1] : null),
      },
      mt5AccountId,
    });

    // If no rows updated, another request already processed it
    if (result.count === 0) {
      const current = await signalRepository.findExecutionStatusByIdForUser(
        executionId,
        userId,
        mt5AccountId
      );
      await signalRepository.reconcileSignalStatusFromExecutions(existing.signalId);

      return {
        success: true,
        message: `Already acknowledged as ${current?.status || 'UNKNOWN'}`
      };
    }

    await signalRepository.reconcileSignalStatusFromExecutions(existing.signalId);

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
    const mt5Account = await signalRepository.findAccountByUserAndAccountId(
      userId,
      accountId
    );

    if (!mt5Account) {
      return { success: false, message: 'Account not found' };
    }

    // Update the MT5Account with current values
    await signalRepository.updateAccountHeartbeat(mt5Account.id, data);

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
    const latestSnapshot =
      await signalRepository.findLatestAccountSnapshot(mt5AccountId);

    // Calculate peak equity (highest seen so far)
    const currentPeakEquity = latestSnapshot?.peakEquity
      ? Math.max(Number(latestSnapshot.peakEquity), equity)
      : equity;

    // Upsert today's snapshot (only one per day)
    await signalRepository.upsertDailyAccountSnapshot({
        mt5AccountId,
        balance,
        equity,
        profit,
        peakEquity: currentPeakEquity,
        snapshotDate: today,
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

  const where: Prisma.SignalWhereInput = {
    OR: [{ providerId: userId }, { executions: { some: { userId } } }],
  };

  if (symbol) where.symbol = symbol;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [signals, total] = await signalRepository.findSignalHistory({
    where,
    userId,
    offset,
    limit,
  });

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

  const executions = await signalRepository.findExecutionsForStatistics(
    userId,
    startDate
  );

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
    const mt5Accounts = await signalRepository.findUserMt5AccountIds(userId);

    if (mt5Accounts.length === 0) {
      return { success: true, data: [], message: 'No MT5 accounts found' };
    }

    const accountIds = mt5Accounts.map((a) => a.id);

    // Get all snapshots for user's accounts in the period
    const snapshots = await signalRepository.findAccountSnapshotsFromDate(
      accountIds,
      startDate
    );

    if (snapshots.length === 0) {
      return { success: true, data: [], message: 'No performance data available' };
    }

    // Get the initial balance (first snapshot or oldest available)
    const initialSnapshot =
      await signalRepository.findInitialAccountSnapshot(accountIds);

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
  return signalRepository.expirePendingSignals();
}
