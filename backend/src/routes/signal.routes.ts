// =============================================================================
// SIGNAL ROUTES - For EA Communication
// =============================================================================

import { Router, Request, Response } from 'express';
import {
  receiveSignal,
  getPendingSignals,
  acknowledgeExecution,
  updateHeartbeat,
  getSignalHistory,
  getSignalStatistics,
  getPerformanceData,
} from '../services/signal.service.js';
import { authenticate, requireActiveSubscription } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { ExecutionStatus, SignalAction, SignalStatus, TradeType } from '@prisma/client';

const router = Router();

const SIGNAL_HISTORY_STATUSES = new Set<string>([
  ...Object.values(SignalStatus),
  ...Object.values(ExecutionStatus),
]);
const SIGNAL_HISTORY_ACTIONS = new Set<string>(Object.values(SignalAction));
const SIGNAL_HISTORY_TYPES = new Set<string>(Object.values(TradeType));

function normalizeSignalHistoryFilter(
  value: unknown,
  allowedValues: Set<string>
) {
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }

  const normalizedValue = value.trim().toUpperCase();
  return allowedValues.has(normalizedValue) ? normalizedValue : undefined;
}

function resolveRequestedAccountId(req: Request, res: Response, requestedAccountId?: string): string | null {
  const accountId = requestedAccountId || req.accountId;

  if (!accountId || accountId.trim() === '') {
    res.status(400).json({ error: 'account_id is required' });
    return null;
  }

  if (req.mt5Account && accountId !== req.mt5Account.accountId) {
    res.status(403).json({ error: 'API key is not authorized for this MT5 account' });
    return null;
  }

  return accountId;
}

// =============================================================================
// RECEIVE SIGNAL FROM SENDER EA
// =============================================================================

router.post('/', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { type, action, data, account_id } = req.body;
  const accountId = resolveRequestedAccountId(req, res, account_id);
  if (!accountId) return;

  // Handle different message types
  if (type === 'HEARTBEAT') {
    const result = await updateHeartbeat(req.user!.id, accountId, data);
    return res.json(result);
  }

  if (type === 'TRADE_SIGNAL') {
    const signal = {
      action: action || data?.action,
      symbol: data?.symbol,
      type: data?.type,
      volume: data?.volume,
      price: data?.price,
      sl: data?.sl,
      tp: data?.tp,
      ticket: data?.ticket,
      masterPositionId: data?.masterPositionId,
      magic: data?.magic,
      comment: data?.comment,
      accountId,
    };

    const result = await receiveSignal(req.user!.id, signal);

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.status(201).json({
      success: true,
      signalId: result.signalId,
      message: result.message,
    });
  }

  // Handle position snapshot
  if (type === 'POSITION_SNAPSHOT') {
    // Store position data for dashboard display
    return res.json({ success: true, message: 'Position snapshot received' });
  }

  return res.status(400).json({ error: 'Unknown message type' });
}));

// =============================================================================
// HEARTBEAT ENDPOINT
// =============================================================================

router.post('/heartbeat', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { account_id, data } = req.body;
  const accountId = resolveRequestedAccountId(req, res, account_id);
  if (!accountId) return;

  const result = await updateHeartbeat(req.user!.id, accountId, {
    balance: data?.balance,
    equity: data?.equity,
    profit: data?.profit,
  });

  res.json(result);
}));

// =============================================================================
// GET PENDING SIGNALS FOR RECEIVER EA
// =============================================================================

router.get('/pending', authenticate, requireActiveSubscription, asyncHandler(async (req: Request, res: Response) => {
  const accountId = resolveRequestedAccountId(req, res, req.query.account_id as string);
  if (!accountId) return;

  const result = await getPendingSignals(req.user!.id, accountId);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  // Return in EA-friendly format
  res.json({ signals: result.signals });
}));

// =============================================================================
// ACKNOWLEDGE SIGNAL EXECUTION
// =============================================================================

router.post('/ack', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { signal_id, status, executed_volume, executed_price, slippage, slave_ticket, error_code, error_message } = req.body;

  if (!signal_id || !status) {
    return res.status(400).json({ error: 'signal_id and status required' });
  }

  const result = await acknowledgeExecution(
    signal_id,
    req.user!.id,
    status,
    {
      executedVolume: executed_volume,
      executedPrice: executed_price,
      slippage: slippage,
      slaveTicket: slave_ticket,
      errorCode: error_code,
      errorMessage: error_message,
    },
    req.mt5Account?.id
  );

  res.json(result);
}));

// =============================================================================
// POSITION UPDATE ENDPOINT
// =============================================================================

router.post('/positions', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { account_id, positions } = req.body;
  
  // Store position data for real-time dashboard
  // This would typically update a cache or real-time database
  
  res.json({ success: true, message: 'Positions updated', count: positions?.length || 0 });
}));

// =============================================================================
// GET SIGNAL HISTORY (Dashboard)
// =============================================================================

router.get('/history', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const options = {
    limit: parseInt(req.query.limit as string) || 50,
    offset: parseInt(req.query.offset as string) || 0,
    symbol: req.query.symbol as string,
    startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
    endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
    status: normalizeSignalHistoryFilter(
      req.query.status,
      SIGNAL_HISTORY_STATUSES
    ),
    action: normalizeSignalHistoryFilter(
      req.query.action,
      SIGNAL_HISTORY_ACTIONS
    ) as SignalAction | undefined,
    type: normalizeSignalHistoryFilter(req.query.type, SIGNAL_HISTORY_TYPES) as TradeType | undefined,
  };

  const result = await getSignalHistory(req.user!.id, options);

  res.json({
    signals: result.signals.map((s) => ({
      id: s.id,
      action: s.action,
      symbol: s.symbol,
      type: s.type,
      volume: Number(s.volume),
      price: Number(s.price),
      sl: s.sl ? Number(s.sl) : null,
      tp: s.tp ? Number(s.tp) : null,
      status: s.status,
      createdAt: s.createdAt,
      execution: s.executions[0] ? {
        status: s.executions[0].status,
        executedAt: s.executions[0].executedAt,
        executedPrice: s.executions[0].executedPrice !== null ? Number(s.executions[0].executedPrice) : null,
        closePrice: s.executions[0].closePrice !== null ? Number(s.executions[0].closePrice) : null,
        profit: s.executions[0].profit !== null ? Number(s.executions[0].profit) : null,
        pnl: s.executions[0].profit !== null ? Number(s.executions[0].profit) : null,
        errorCode: s.executions[0].errorCode,
        errorMessage: s.executions[0].errorMessage,
      } : null,
    })),
    total: result.total,
    limit: result.limit,
    offset: result.offset,
  });
}));

// =============================================================================
// GET SIGNAL STATISTICS (Dashboard)
// =============================================================================

router.get('/stats', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as 'day' | 'week' | 'month' | 'all') || 'month';
  const stats = await getSignalStatistics(req.user!.id, period);

  res.json(stats);
}));

// =============================================================================
// GET PERFORMANCE DATA (Dashboard Chart)
// =============================================================================

router.get('/performance', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const period = (req.query.period as '7D' | '30D' | '90D') || '30D';
  const granularity =
    (req.query.granularity as 'hourly' | 'daily' | 'weekly' | 'monthly') || 'daily';

  // Validate period parameter
  if (!['7D', '30D', '90D'].includes(period)) {
    return res.status(400).json({ error: 'Invalid period. Use 7D, 30D, or 90D' });
  }

  if (!['hourly', 'daily', 'weekly', 'monthly'].includes(granularity)) {
    return res.status(400).json({
      error: 'Invalid granularity. Use hourly, daily, weekly, or monthly',
    });
  }

  const result = await getPerformanceData(req.user!.id, period, granularity);

  if (!result.success) {
    return res.status(500).json({ error: result.message });
  }

  res.json({
    data: result.data,
    period,
    granularity,
    source: result.source,
    message: result.message,
  });
}));

export default router;






