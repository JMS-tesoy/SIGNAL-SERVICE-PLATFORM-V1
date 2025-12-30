// =============================================================================
// SUBSCRIPTION ROUTES
// =============================================================================

import { Router, Request, Response } from 'express';
import {
  getSubscriptionTiers,
  getUserSubscription,
  createCheckoutSession,
  cancelSubscription,
  resumeSubscription,
  changeSubscriptionTier,
  getPaymentHistory,
  getBillingPortalUrl,
  checkFeatureAccess,
  checkSignalLimit,
} from '../services/subscription.service.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { BillingCycle } from '@prisma/client';

const router = Router();

// =============================================================================
// GET ALL SUBSCRIPTION TIERS (Public)
// =============================================================================

router.get('/tiers', asyncHandler(async (req: Request, res: Response) => {
  const tiers = await getSubscriptionTiers();
  
  // Format for frontend display
  const formattedTiers = tiers.map((tier) => ({
    id: tier.id,
    name: tier.name,
    displayName: tier.displayName,
    description: tier.description,
    priceMonthly: Number(tier.priceMonthly),
    priceYearly: Number(tier.priceYearly),
    currency: tier.currency,
    features: Array.isArray(tier.features) ? tier.features : [],
    maxSignalsPerDay: tier.maxSignalsPerDay,
    maxSlaveAccounts: tier.maxSlaveAccounts,
    signalDelay: tier.signalDelay,
    isPopular: tier.isPopular,
  }));

  res.json({ tiers: formattedTiers });
}));

// =============================================================================
// GET CURRENT USER SUBSCRIPTION
// =============================================================================

router.get('/current', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const subscription = await getUserSubscription(req.user!.id);

  if (!subscription) {
    return res.json({ subscription: null });
  }

  res.json({
    subscription: {
      id: subscription.id,
      status: subscription.status,
      tier: {
        id: subscription.tier.id,
        name: subscription.tier.name,
        displayName: subscription.tier.displayName,
        features: Array.isArray(subscription.tier.features) ? subscription.tier.features : [],
        maxSignalsPerDay: subscription.tier.maxSignalsPerDay,
        maxSlaveAccounts: subscription.tier.maxSlaveAccounts,
      },
      billingCycle: subscription.billingCycle,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    },
  });
}));

// =============================================================================
// CREATE CHECKOUT SESSION
// =============================================================================

router.post('/checkout', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { tierId, billingCycle } = req.body;

  if (!tierId) {
    return res.status(400).json({ error: 'Tier ID required' });
  }

  const cycle = (billingCycle || 'MONTHLY') as BillingCycle;
  const result = await createCheckoutSession(req.user!.id, tierId, cycle);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ url: result.url });
}));

// =============================================================================
// CANCEL SUBSCRIPTION
// =============================================================================

router.post('/cancel', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { immediately } = req.body;
  const result = await cancelSubscription(req.user!.id, immediately === true);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({
    message: result.message,
    subscription: result.subscription,
  });
}));

// =============================================================================
// RESUME SUBSCRIPTION
// =============================================================================

router.post('/resume', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const result = await resumeSubscription(req.user!.id);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({
    message: result.message,
    subscription: result.subscription,
  });
}));

// =============================================================================
// CHANGE SUBSCRIPTION TIER
// =============================================================================

router.post('/change-tier', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { tierId, billingCycle } = req.body;

  if (!tierId) {
    return res.status(400).json({ error: 'Tier ID required' });
  }

  const result = await changeSubscriptionTier(
    req.user!.id,
    tierId,
    billingCycle as BillingCycle | undefined
  );

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({
    message: result.message,
    subscription: result.subscription,
  });
}));

// =============================================================================
// GET PAYMENT HISTORY
// =============================================================================

router.get('/payments', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10;
  const payments = await getPaymentHistory(req.user!.id, limit);

  res.json({
    payments: payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      description: p.description,
      paidAt: p.paidAt,
      createdAt: p.createdAt,
    })),
  });
}));

// =============================================================================
// GET BILLING PORTAL URL
// =============================================================================

router.get('/billing-portal', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const result = await getBillingPortalUrl(req.user!.id);

  if (!result.success) {
    return res.status(400).json({ error: result.message });
  }

  res.json({ url: result.url });
}));

// =============================================================================
// CHECK FEATURE ACCESS
// =============================================================================

router.get('/feature/:featureName', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { featureName } = req.params;
  const hasAccess = await checkFeatureAccess(req.user!.id, featureName);

  res.json({ feature: featureName, hasAccess });
}));

// =============================================================================
// CHECK SIGNAL LIMIT
// =============================================================================

router.get('/signal-limit', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const result = await checkSignalLimit(req.user!.id);
  res.json(result);
}));

export default router;
