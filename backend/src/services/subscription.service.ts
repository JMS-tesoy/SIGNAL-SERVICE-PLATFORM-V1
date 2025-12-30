// =============================================================================
// SUBSCRIPTION SERVICE - Stripe Integration & Plan Management
// =============================================================================

import Stripe from 'stripe';
import prisma from '../config/database.js';
import { sendEmail, emailTemplates } from './email.service.js';
import { BillingCycle, SubscriptionStatus } from '@prisma/client';

// =============================================================================
// STRIPE CLIENT
// =============================================================================

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

// =============================================================================
// TYPES
// =============================================================================

interface CreateSubscriptionInput {
  userId: string;
  tierId: string;
  billingCycle: BillingCycle;
  paymentMethodId?: string;
}

interface SubscriptionResult {
  success: boolean;
  message: string;
  subscription?: any;
  clientSecret?: string; // For payment confirmation
}

// =============================================================================
// GET SUBSCRIPTION TIERS
// =============================================================================

export async function getSubscriptionTiers() {
  return prisma.subscriptionTier.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

// =============================================================================
// GET USER SUBSCRIPTION
// =============================================================================

export async function getUserSubscription(userId: string) {
  return prisma.subscription.findUnique({
    where: { userId },
    include: {
      tier: true,
    },
  });
}

// =============================================================================
// CREATE OR GET STRIPE CUSTOMER
// =============================================================================

async function getOrCreateStripeCustomer(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Check if customer already exists
  if (user.subscription?.stripeCustomerId) {
    return user.subscription.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email: user.email,
    name: user.name || undefined,
    metadata: {
      userId: user.id,
    },
  });

  return customer.id;
}

// =============================================================================
// CREATE CHECKOUT SESSION
// =============================================================================

export async function createCheckoutSession(
  userId: string,
  tierId: string,
  billingCycle: BillingCycle
): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return { success: false, message: 'User not found' };
    }

    const tier = await prisma.subscriptionTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      return { success: false, message: 'Subscription tier not found' };
    }

    // Get the appropriate Stripe price ID
    const priceId = billingCycle === 'YEARLY' 
      ? tier.stripePriceYearly 
      : tier.stripePriceMonthly;

    if (!priceId) {
      return { success: false, message: 'Stripe price not configured for this tier' };
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL}/dashboard/subscription?success=true`,
      cancel_url: `${process.env.FRONTEND_URL}/dashboard/subscription?canceled=true`,
      metadata: {
        userId: user.id,
        tierId: tier.id,
        billingCycle,
      },
    });

    return {
      success: true,
      url: session.url || undefined,
      message: 'Checkout session created',
    };
  } catch (error) {
    console.error('Checkout session error:', error);
    return { success: false, message: 'Failed to create checkout session' };
  }
}

// =============================================================================
// CREATE SUBSCRIPTION (Direct API - for saved payment methods)
// =============================================================================

export async function createSubscription(input: CreateSubscriptionInput): Promise<SubscriptionResult> {
  try {
    const { userId, tierId, billingCycle, paymentMethodId } = input;

    const tier = await prisma.subscriptionTier.findUnique({
      where: { id: tierId },
    });

    if (!tier) {
      return { success: false, message: 'Subscription tier not found' };
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId);

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    // Get price ID
    const priceId = billingCycle === 'YEARLY' 
      ? tier.stripePriceYearly 
      : tier.stripePriceMonthly;

    if (!priceId) {
      return { success: false, message: 'Stripe price not configured' };
    }

    // Create Stripe subscription
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
    });

    // Get client secret for payment confirmation
    const invoice = stripeSubscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice.payment_intent as Stripe.PaymentIntent;

    // Create or update subscription in database
    const subscription = await prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        tierId,
        billingCycle,
        stripeCustomerId: customerId,
        stripeSubscriptionId: stripeSubscription.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      },
      update: {
        tierId,
        billingCycle,
        stripeSubscriptionId: stripeSubscription.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      include: { tier: true },
    });

    return {
      success: true,
      message: 'Subscription created',
      subscription,
      clientSecret: paymentIntent?.client_secret || undefined,
    };
  } catch (error) {
    console.error('Create subscription error:', error);
    return { success: false, message: 'Failed to create subscription' };
  }
}

// =============================================================================
// CANCEL SUBSCRIPTION
// =============================================================================

export async function cancelSubscription(
  userId: string,
  immediately: boolean = false
): Promise<SubscriptionResult> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription) {
      return { success: false, message: 'No active subscription found' };
    }

    if (subscription.stripeSubscriptionId) {
      if (immediately) {
        // Cancel immediately
        await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      } else {
        // Cancel at period end
        await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }
    }

    // Update database
    const updatedSubscription = await prisma.subscription.update({
      where: { userId },
      data: {
        status: immediately ? 'CANCELED' : 'ACTIVE',
        cancelAtPeriodEnd: !immediately,
        canceledAt: new Date(),
      },
      include: { tier: true },
    });

    return {
      success: true,
      message: immediately 
        ? 'Subscription canceled' 
        : 'Subscription will be canceled at the end of the billing period',
      subscription: updatedSubscription,
    };
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return { success: false, message: 'Failed to cancel subscription' };
  }
}

// =============================================================================
// RESUME SUBSCRIPTION
// =============================================================================

export async function resumeSubscription(userId: string): Promise<SubscriptionResult> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeSubscriptionId) {
      return { success: false, message: 'No subscription to resume' };
    }

    // Resume in Stripe
    await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: false,
    });

    // Update database
    const updatedSubscription = await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
      include: { tier: true },
    });

    return {
      success: true,
      message: 'Subscription resumed',
      subscription: updatedSubscription,
    };
  } catch (error) {
    console.error('Resume subscription error:', error);
    return { success: false, message: 'Failed to resume subscription' };
  }
}

// =============================================================================
// CHANGE SUBSCRIPTION TIER
// =============================================================================

export async function changeSubscriptionTier(
  userId: string,
  newTierId: string,
  billingCycle?: BillingCycle
): Promise<SubscriptionResult> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
      include: { tier: true },
    });

    if (!subscription) {
      return { success: false, message: 'No active subscription found' };
    }

    const newTier = await prisma.subscriptionTier.findUnique({
      where: { id: newTierId },
    });

    if (!newTier) {
      return { success: false, message: 'Subscription tier not found' };
    }

    const cycle = billingCycle || subscription.billingCycle;
    const priceId = cycle === 'YEARLY' ? newTier.stripePriceYearly : newTier.stripePriceMonthly;

    if (subscription.stripeSubscriptionId && priceId) {
      // Get current subscription from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );

      // Update subscription with new price
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [
          {
            id: stripeSubscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: 'create_prorations',
      });
    }

    // Update database
    const updatedSubscription = await prisma.subscription.update({
      where: { userId },
      data: {
        tierId: newTierId,
        billingCycle: cycle,
      },
      include: { tier: true },
    });

    // Send confirmation email
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      const emailData = emailTemplates.subscriptionConfirmed(
        newTier.displayName,
        updatedSubscription.currentPeriodEnd
      );
      await sendEmail({
        to: user.email,
        subject: emailData.subject,
        html: emailData.html,
      });
    }

    return {
      success: true,
      message: 'Subscription updated successfully',
      subscription: updatedSubscription,
    };
  } catch (error) {
    console.error('Change subscription error:', error);
    return { success: false, message: 'Failed to update subscription' };
  }
}

// =============================================================================
// GET PAYMENT HISTORY
// =============================================================================

export async function getPaymentHistory(userId: string, limit: number = 10) {
  return prisma.payment.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

// =============================================================================
// GET BILLING PORTAL URL
// =============================================================================

export async function getBillingPortalUrl(userId: string): Promise<{ success: boolean; url?: string; message: string }> {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      return { success: false, message: 'No billing information found' };
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard/subscription`,
    });

    return {
      success: true,
      url: session.url,
      message: 'Billing portal URL generated',
    };
  } catch (error) {
    console.error('Billing portal error:', error);
    return { success: false, message: 'Failed to access billing portal' };
  }
}

// =============================================================================
// CHECK FEATURE ACCESS
// =============================================================================

export async function checkFeatureAccess(
  userId: string,
  feature: string
): Promise<boolean> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { tier: true },
  });

  if (!subscription || subscription.status !== 'ACTIVE') {
    return false;
  }

  const features = subscription.tier.features as string[];
  return features.includes(feature);
}

// =============================================================================
// CHECK SIGNAL LIMIT
// =============================================================================

export async function checkSignalLimit(userId: string): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { tier: true },
  });

  if (!subscription) {
    return { allowed: false, remaining: 0, limit: 0 };
  }

  const limit = subscription.tier.maxSignalsPerDay;
  
  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, remaining: -1, limit: -1 };
  }

  // Count today's signal executions
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const count = await prisma.signalExecution.count({
    where: {
      userId,
      receivedAt: { gte: today },
    },
  });

  const remaining = Math.max(0, limit - count);

  return {
    allowed: remaining > 0,
    remaining,
    limit,
  };
}
