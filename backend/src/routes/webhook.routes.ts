// =============================================================================
// WEBHOOK ROUTES - Stripe Integration
// =============================================================================

import { Router, Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../config/database.js";
import { sendEmail, emailTemplates } from "../services/email.service.js";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

// Track processed event IDs to prevent replay (in-memory, resets on restart)
// For production, consider Redis or database-backed storage
const processedEvents = new Set<string>();
const MAX_PROCESSED_EVENTS = 10000;

function markEventProcessed(eventId: string): boolean {
  // If already processed, return false (duplicate)
  if (processedEvents.has(eventId)) {
    return false;
  }

  // Prevent unbounded memory growth
  if (processedEvents.size >= MAX_PROCESSED_EVENTS) {
    const iterator = processedEvents.values();
    const oldest = iterator.next().value;
    if (oldest) {
      processedEvents.delete(oldest);
    }
  }

  processedEvents.add(eventId);
  return true;
}

// =============================================================================
// STRIPE WEBHOOK
// =============================================================================

router.post("/stripe", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res
      .status(400)
      .json({ error: "Missing signature or webhook secret" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return res
      .status(400)
      .json({ error: "Webhook signature verification failed" });
  }

  console.log("Received Stripe event:", event.type, event.id);

  // Check for duplicate events (replay protection)
  if (!markEventProcessed(event.id)) {
    console.log(`Duplicate event ignored: ${event.id}`);
    return res.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdate(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    res.status(500).json({ error: "Webhook handler failed" });
  }
});

// =============================================================================
// WEBHOOK HANDLERS
// =============================================================================

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { userId, tierId, billingCycle } = session.metadata || {};

  if (!userId || !tierId) {
    console.error("Missing metadata in checkout session");
    return;
  }

  // Update subscription in database
  await prisma.subscription.upsert({
    where: { userId },
    create: {
      userId,
      tierId,
      billingCycle: (billingCycle as any) || "MONTHLY",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      status: "ACTIVE",
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    update: {
      tierId,
      billingCycle: (billingCycle as any) || "MONTHLY",
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: session.subscription as string,
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      canceledAt: null,
    },
  });

  // Send confirmation email
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const tier = await prisma.subscriptionTier.findUnique({
    where: { id: tierId },
  });

  if (user && tier) {
    const emailData = emailTemplates.subscriptionConfirmed(
      tier.displayName,
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );
    await sendEmail({
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
    });
  }

  console.log(`Checkout completed for user ${userId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Find subscription by Stripe ID
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    console.error("Subscription not found:", subscription.id);
    return;
  }

  // Map Stripe status to our status
  let status: "ACTIVE" | "PAST_DUE" | "CANCELED" | "EXPIRED" | "TRIALING";
  switch (subscription.status) {
    case "active":
      status = "ACTIVE";
      break;
    case "past_due":
      status = "PAST_DUE";
      break;
    case "canceled":
      status = "CANCELED";
      break;
    case "trialing":
      status = "TRIALING";
      break;
    default:
      status = "ACTIVE";
  }

  await prisma.subscription.update({
    where: { id: dbSubscription.id },
    data: {
      status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
    },
  });

  console.log(`Subscription updated: ${subscription.id} -> ${status}`);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const dbSubscription = await prisma.subscription.findFirst({
    where: { stripeSubscriptionId: subscription.id },
  });

  if (!dbSubscription) {
    return;
  }

  // Downgrade to free tier
  const freeTier = await prisma.subscriptionTier.findFirst({
    where: { name: "free" },
  });

  if (freeTier) {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        tierId: freeTier.id,
        status: "ACTIVE",
        stripeSubscriptionId: null,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      },
    });
  } else {
    await prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: {
        status: "CANCELED",
      },
    });
  }

  console.log(`Subscription deleted: ${subscription.id}`);
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Check if this invoice was already processed (database-level idempotency)
  const existingPayment = await prisma.payment.findFirst({
    where: { stripeInvoiceId: invoice.id },
  });

  if (existingPayment) {
    console.log(`Invoice ${invoice.id} already processed, skipping`);
    return;
  }

  // Find subscription by customer ID
  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!subscription) {
    return;
  }

  // Record payment
  await prisma.payment.create({
    data: {
      userId: subscription.userId,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: "SUCCEEDED",
      stripePaymentId: invoice.payment_intent as string,
      stripeInvoiceId: invoice.id,
      description: `Subscription payment`,
      paidAt: new Date(),
    },
  });

  // Send receipt email
  const emailData = emailTemplates.paymentReceipt(
    invoice.amount_paid / 100,
    invoice.currency.toUpperCase(),
    invoice.id
  );
  await sendEmail({
    to: subscription.user.email,
    subject: emailData.subject,
    html: emailData.html,
  });

  console.log(`Invoice paid: ${invoice.id}`);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string;

  // Check if this failed invoice was already recorded (database-level idempotency)
  const existingPayment = await prisma.payment.findFirst({
    where: { stripeInvoiceId: invoice.id, status: "FAILED" },
  });

  if (existingPayment) {
    console.log(`Failed invoice ${invoice.id} already recorded, skipping`);
    return;
  }

  const subscription = await prisma.subscription.findFirst({
    where: { stripeCustomerId: customerId },
    include: { user: true },
  });

  if (!subscription) {
    return;
  }

  // Record failed payment
  await prisma.payment.create({
    data: {
      userId: subscription.userId,
      amount: invoice.amount_due / 100,
      currency: invoice.currency.toUpperCase(),
      status: "FAILED",
      stripeInvoiceId: invoice.id,
      description: `Failed subscription payment`,
      failedAt: new Date(),
    },
  });

  // Update subscription status
  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: "PAST_DUE" },
  });

  // Send notification email
  await sendEmail({
    to: subscription.user.email,
    subject: "Payment Failed - Action Required",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Payment Failed</h2>
        <p>We were unable to process your subscription payment.</p>
        <p>Please update your payment method to continue receiving signals.</p>
        <a href="${process.env.FRONTEND_URL}/dashboard/subscription" 
           style="display: inline-block; background: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 16px;">
          Update Payment Method
        </a>
      </div>
    `,
  });

  console.log(`Invoice payment failed: ${invoice.id}`);
}

export default router;
