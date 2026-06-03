// =============================================================================
// SIGNAL SERVICE - Trade Signal Processing
// =============================================================================

import { checkSignalLimit } from './subscription.service.js';
import { Prisma, SignalAction, SignalStatus, TradeType, ExecutionStatus } from '@prisma/client';
import { signalRepository } from '../database/repositories/index.js';
import { emitDashboardRealtimeEvent } from './realtime.service.js';

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
  masterPositionId?: number;
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
    const masterPositionId = signal.masterPositionId ? BigInt(signal.masterPositionId) : null;
    const action = signal.action.toUpperCase() as SignalAction;
    const sl = signal.sl || null;
    const tp = signal.tp || null;

    if (masterTicket) {
      if (action === "MODIFY") {
        const latestModifySignal = await signalRepository.findLatestModifySignalByMasterTicket({
          providerId,
          mt5AccountId: mt5Account.id,
          masterTicket,
        });

        const incomingSl = normalizeOptionalPrice(sl);
        const incomingTp = normalizeOptionalPrice(tp);
        const storedSl = normalizeStoredPrice(latestModifySignal?.sl);
        const storedTp = normalizeStoredPrice(latestModifySignal?.tp);

        if (latestModifySignal && incomingSl === storedSl && incomingTp === storedTp) {
          return {
            success: true,
            message: 'Signal already received',
            signalId: latestModifySignal.id,
          };
        }
      } else {
        const existingSignal = await signalRepository.findSignalByMasterTicketAndAction({
          providerId,
          mt5AccountId: mt5Account.id,
          masterTicket,
          action,
        });

        if (existingSignal) {
          return {
            success: true,
            message: 'Signal already received',
            signalId: existingSignal.id,
          };
        }
      }
    }

    const newSignal = await signalRepository.createSignal({
      providerId,
      mt5AccountId: mt5Account.id,
      action,
      symbol: signal.symbol,
      type: signal.type.toUpperCase() as TradeType,
      volume: signal.volume,
      price: signal.price,
      sl,
      tp,
      masterTicket,
      masterPositionId,
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
    const limitCheck = await checkSignalLimit(userId);
    if (!limitCheck.allowed) {
      return { success: true, signals: [], message: 'Daily signal limit reached' };
    }

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
    const signalDelay = subscription?.tier.signalDelay || 0;
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
      masterPositionId: exec.signal.masterPositionId ? Number(exec.signal.masterPositionId) : 0,
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
const SIGNAL_HISTORY_SIGNAL_STATUSES = new Set<string>(Object.values(SignalStatus));
const SIGNAL_HISTORY_EXECUTION_STATUSES = new Set<string>(Object.values(ExecutionStatus));

function normalizeOptionalPrice(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) {
    return null;
  }

  return value.toFixed(5);
}

function normalizeStoredPrice(value: Prisma.Decimal | null | undefined) {
  if (!value || value.isZero()) {
    return null;
  }

  return value.toFixed(5);
}

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

    emitDashboardRealtimeEvent(userId, {
      type: 'dashboard:trade-report',
      signalId: existing.signalId,
      status: execStatus,
      occurredAt: new Date().toISOString(),
    });

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
  options: {
    limit?: number;
    offset?: number;
    symbol?: string;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    action?: SignalAction;
    type?: TradeType;
  } = {}
) {
  const { limit = 50, offset = 0, symbol, startDate, endDate, status, action, type } = options;

  const where: Prisma.SignalWhereInput = {
    OR: [{ providerId: userId }, { executions: { some: { userId } } }],
  };

  if (symbol) where.symbol = { contains: symbol, mode: 'insensitive' };
  if (action) where.action = action;
  if (type) where.type = type;
  if (status) {
    const statusFilters: Prisma.SignalWhereInput[] = [];

    if (SIGNAL_HISTORY_SIGNAL_STATUSES.has(status)) {
      statusFilters.push({ status: status as SignalStatus });
    }

    if (SIGNAL_HISTORY_EXECUTION_STATUSES.has(status)) {
      statusFilters.push({
        executions: { some: { userId, status: status as ExecutionStatus } },
      });
    }

    if (statusFilters.length > 0) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        { OR: statusFilters },
      ];
    }
  }
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

  const signals = await signalRepository.findSignalsForStatistics({
    where: {
      OR: [{ providerId: userId }, { executions: { some: { userId } } }],
      createdAt: { gte: startDate },
    },
    userId,
  });

  const stats = {
    totalSignals: signals.length,
    executed: 0,
    failed: 0,
    skipped: 0,
    expired: 0,
    canceled: 0,
    pending: 0,
    bySymbol: {} as Record<string, number>,
    byAction: { OPEN: 0, CLOSE: 0, MODIFY: 0 },
  };

  signals.forEach((signal) => {
    const status = String(signal.executions[0]?.status || signal.status);

    if (status === 'EXECUTED') stats.executed += 1;
    else if (status === 'FAILED') stats.failed += 1;
    else if (status === 'SKIPPED') stats.skipped += 1;
    else if (status === 'EXPIRED') stats.expired += 1;
    else if (status === 'CANCELED') stats.canceled += 1;
    else stats.pending += 1;

    stats.bySymbol[signal.symbol] = (stats.bySymbol[signal.symbol] || 0) + 1;
    stats.byAction[signal.action]++;
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

type PerformanceSource = 'ACCOUNT_SNAPSHOT' | 'SIGNAL_EXECUTION';
type PerformanceGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly';

type PerformanceAggregate = {
  totalBalance: number;
  totalEquity: number;
  peakEquity: number;
};

function getDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function getPerformanceBucketDate(date: Date, granularity: PerformanceGranularity) {
  const bucketDate = new Date(date);

  if (granularity === 'hourly') {
    bucketDate.setMinutes(0, 0, 0);
    return bucketDate;
  }

  bucketDate.setHours(0, 0, 0, 0);

  if (granularity === 'weekly') {
    const day = bucketDate.getDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    bucketDate.setDate(bucketDate.getDate() - daysFromMonday);
  }

  if (granularity === 'monthly') {
    bucketDate.setDate(1);
  }

  return bucketDate;
}

function getPerformanceBucketKey(date: Date, granularity: PerformanceGranularity) {
  const bucketDate = getPerformanceBucketDate(date, granularity);

  if (granularity === 'hourly') {
    return bucketDate.toISOString().slice(0, 13);
  }

  if (granularity === 'monthly') {
    return bucketDate.toISOString().slice(0, 7);
  }

  return getDateKey(bucketDate);
}

function formatPerformanceBucketLabel(bucketKey: string, granularity: PerformanceGranularity) {
  const bucketDate =
    granularity === 'hourly'
      ? new Date(`${bucketKey}:00:00.000Z`)
      : granularity === 'monthly'
        ? new Date(`${bucketKey}-01T00:00:00.000Z`)
        : new Date(`${bucketKey}T00:00:00.000Z`);

  if (granularity === 'hourly') {
    return bucketDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
    });
  }

  if (granularity === 'weekly') {
    return `Week of ${bucketDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })}`;
  }

  if (granularity === 'monthly') {
    return bucketDate.toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  }

  return bucketDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function mergePerformanceAggregate(
  dateMap: Map<string, PerformanceAggregate>,
  dateKey: string,
  values: PerformanceAggregate
) {
  const existing = dateMap.get(dateKey);

  if (existing) {
    existing.totalBalance += values.totalBalance;
    existing.totalEquity += values.totalEquity;
    existing.peakEquity = Math.max(existing.peakEquity, values.peakEquity);
    return;
  }

  dateMap.set(dateKey, values);
}

function getSignalPerformanceKey(signal: {
  mt5AccountId: string | null;
  masterTicket: bigint | null;
  masterPositionId: bigint | null;
  symbol: string;
}) {
  const positionId = signal.masterPositionId?.toString();
  const ticket = signal.masterTicket?.toString();

  if (!positionId && !ticket) {
    return null;
  }

  return [
    signal.mt5AccountId || 'account',
    signal.symbol,
    positionId || ticket,
  ].join(':');
}

function getExecutableSignalPrice(signal: {
  price: Prisma.Decimal;
  providerId: string;
  executions: { executedPrice: Prisma.Decimal | null }[];
}, userId: string) {
  const executedPrice = signal.executions[0]?.executedPrice;
  if (executedPrice) {
    return Number(executedPrice);
  }

  if (signal.providerId === userId) {
    return Number(signal.price);
  }

  return null;
}

async function buildSignalExecutionPerformanceData(
  userId: string,
  startDate: Date,
  granularity: PerformanceGranularity
): Promise<PerformanceDataPoint[]> {
  const signals = await signalRepository.findExecutedTradeSignalsForPerformance(userId);
  const openSignals = new Map<string, { price: number; type: TradeType }>();
  const bucketResults = new Map<string, number>();

  for (const signal of signals) {
    const key = getSignalPerformanceKey(signal);
    if (!key) continue;

    const price = getExecutableSignalPrice(signal, userId);
    if (!price || price <= 0) continue;

    if (signal.action === 'OPEN') {
      openSignals.set(key, { price, type: signal.type });
      continue;
    }

    const openSignal = openSignals.get(key);
    if (!openSignal) continue;

    const closedAt = signal.executions[0]?.executedAt || signal.createdAt;
    if (closedAt < startDate) continue;

    const result =
      openSignal.type === 'BUY'
        ? ((price - openSignal.price) / openSignal.price) * 100
        : ((openSignal.price - price) / openSignal.price) * 100;

    const bucketKey = getPerformanceBucketKey(closedAt, granularity);
    bucketResults.set(bucketKey, (bucketResults.get(bucketKey) || 0) + result);
    openSignals.delete(key);
  }

  const data: PerformanceDataPoint[] = [];
  let cumulativeResult = 0;
  let runningPeak = 0;

  for (const [bucketKey, result] of [...bucketResults.entries()].sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    const normalizedResult = Math.abs(result) < 0.0001 ? 0 : result;
    cumulativeResult += normalizedResult;
    runningPeak = Math.max(runningPeak, cumulativeResult);

    data.push({
      date: formatPerformanceBucketLabel(bucketKey, granularity),
      growth: Math.round(cumulativeResult * 100) / 100,
      drawdown: Math.round((cumulativeResult - runningPeak) * 100) / 100,
    });
  }

  return data;
}

export async function getPerformanceData(
  userId: string,
  period: '7D' | '30D' | '90D' = '30D',
  granularity: PerformanceGranularity = 'daily'
): Promise<{
  success: boolean;
  data: PerformanceDataPoint[];
  message?: string;
  source?: PerformanceSource;
}> {
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
    const currentAccounts = mt5Accounts
      .map((account) => ({
        balance: Number(account.balance),
        equity: Number(account.equity),
        profit: Number(account.profit),
        lastHeartbeat: account.lastHeartbeat,
      }))
      .filter(
        (account) =>
          account.lastHeartbeat &&
          (account.balance > 0 || account.equity > 0 || account.profit !== 0)
      );

    // Get all snapshots for user's accounts in the period
    const snapshots = await signalRepository.findAccountSnapshotsFromDate(
      accountIds,
      startDate
    );

    const signalExecutionData = await buildSignalExecutionPerformanceData(
      userId,
      startDate,
      granularity
    );

    if (snapshots.length === 0 && currentAccounts.length === 0) {
      return signalExecutionData.length > 0
        ? {
            success: true,
            data: signalExecutionData,
            source: 'SIGNAL_EXECUTION',
            message:
              'Signal-derived trade movement from executed OPEN/CLOSE activity; connect MT5 heartbeat balance/equity for account performance',
          }
        : { success: true, data: [], message: 'No performance data available' };
    }

    const currentTotalBalance = currentAccounts.reduce(
      (total, account) => total + account.balance,
      0
    );

    // Group snapshots by date and aggregate across all accounts
    const dateMap = new Map<string, PerformanceAggregate>();

    for (const snapshot of snapshots) {
      mergePerformanceAggregate(
        dateMap,
        getPerformanceBucketKey(snapshot.snapshotDate, granularity),
        {
          totalBalance: Number(snapshot.balance),
          totalEquity: Number(snapshot.equity),
          peakEquity: Number(snapshot.peakEquity),
        }
      );
    }

    if (currentAccounts.length > 0) {
      const todayKey = getPerformanceBucketKey(new Date(), granularity);
      dateMap.set(todayKey, {
        totalBalance: currentAccounts.reduce((total, account) => total + account.balance, 0),
        totalEquity: currentAccounts.reduce((total, account) => total + account.equity, 0),
        peakEquity: Math.max(...currentAccounts.map((account) => account.equity)),
      });
    }

    // Calculate performance metrics
    const data: PerformanceDataPoint[] = [];
    const sortedPerformanceEntries = [...dateMap.entries()].sort(([left], [right]) =>
      left.localeCompare(right)
    );
    const initialBalance =
      sortedPerformanceEntries[0]?.[1].totalBalance || currentTotalBalance;
    let runningPeakEquity = initialBalance;

    for (const [dateKey, values] of sortedPerformanceEntries) {
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
        date: formatPerformanceBucketLabel(dateKey, granularity),
        growth: Math.round(growth * 100) / 100,
        drawdown: Math.round(drawdown * 100) / 100,
      });
    }

    if (data.length < 2 && signalExecutionData.length > 0) {
      return {
        success: true,
        data: signalExecutionData,
        source: 'SIGNAL_EXECUTION',
        message:
          'Signal-derived trade movement from executed OPEN/CLOSE activity; waiting for more MT5 heartbeat snapshots for account performance',
      };
    }

    return {
      success: true,
      data,
      source: 'ACCOUNT_SNAPSHOT',
      message:
        data.length < 2
          ? 'Waiting for more MT5 heartbeat snapshots to draw a performance curve'
          : undefined,
    };
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


