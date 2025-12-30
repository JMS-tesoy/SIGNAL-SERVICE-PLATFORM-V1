// =============================================================================
// DATABASE SEED - Initial Subscription Tiers & Admin User
// Run with: npx prisma db seed
// =============================================================================

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // =============================================================================
  // SUBSCRIPTION TIERS
  // =============================================================================

  const tiers = [
    {
      name: 'free',
      displayName: 'Free',
      description: 'Get started with basic signal access',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'USD',
      maxSignalsPerDay: 5,
      maxSlaveAccounts: 1,
      signalDelay: 60, // 60 seconds delay
      features: JSON.stringify([
        '5 signals per day',
        '1 MT5 account',
        '60-second signal delay',
        'Basic dashboard',
        'Email support',
      ]),
      isPopular: false,
      sortOrder: 0,
      isActive: true,
    },
    {
      name: 'basic',
      displayName: 'Basic',
      description: 'Perfect for individual traders',
      priceMonthly: 29.99,
      priceYearly: 299.99,
      currency: 'USD',
      stripePriceMonthly: 'price_basic_monthly', // Replace with actual Stripe price IDs
      stripePriceYearly: 'price_basic_yearly',
      maxSignalsPerDay: 50,
      maxSlaveAccounts: 2,
      signalDelay: 30, // 30 seconds delay
      features: JSON.stringify([
        '50 signals per day',
        '2 MT5 accounts',
        '30-second signal delay',
        'Full dashboard access',
        'Signal history',
        'Email & chat support',
      ]),
      isPopular: false,
      sortOrder: 1,
      isActive: true,
    },
    {
      name: 'pro',
      displayName: 'Pro',
      description: 'Best value for active traders',
      priceMonthly: 79.99,
      priceYearly: 799.99,
      currency: 'USD',
      stripePriceMonthly: 'price_pro_monthly',
      stripePriceYearly: 'price_pro_yearly',
      maxSignalsPerDay: -1, // Unlimited
      maxSlaveAccounts: 5,
      signalDelay: 5, // 5 seconds delay
      features: JSON.stringify([
        'Unlimited signals',
        '5 MT5 accounts',
        '5-second signal delay',
        'Advanced analytics',
        'Monthly reports',
        'Priority support',
        'API access',
      ]),
      isPopular: true,
      sortOrder: 2,
      isActive: true,
    },
    {
      name: 'premium',
      displayName: 'Premium',
      description: 'For professional trading operations',
      priceMonthly: 199.99,
      priceYearly: 1999.99,
      currency: 'USD',
      stripePriceMonthly: 'price_premium_monthly',
      stripePriceYearly: 'price_premium_yearly',
      maxSignalsPerDay: -1, // Unlimited
      maxSlaveAccounts: 20,
      signalDelay: 0, // No delay - instant signals
      features: JSON.stringify([
        'Unlimited signals',
        '20 MT5 accounts',
        'Instant signals (no delay)',
        'Advanced analytics',
        'Custom reports',
        'Dedicated support',
        'Full API access',
        'White-label options',
        'Custom integrations',
      ]),
      isPopular: false,
      sortOrder: 3,
      isActive: true,
    },
  ];

  for (const tier of tiers) {
    await prisma.subscriptionTier.upsert({
      where: { name: tier.name },
      update: tier,
      create: tier,
    });
    console.log(`Created/updated tier: ${tier.displayName}`);
  }

  // =============================================================================
  // ADMIN USER
  // =============================================================================

  const adminEmail = 'admin@signalservice.com';
  const adminPassword = await bcrypt.hash('Admin123!@#', 12);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      password: adminPassword,
      name: 'System Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerified: true,
      emailVerifiedAt: new Date(),
    },
  });

  console.log(`Admin user created: ${adminEmail}`);

  // Create free subscription for admin
  const freeTier = await prisma.subscriptionTier.findFirst({ where: { name: 'free' } });
  
  if (freeTier) {
    await prisma.subscription.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        tierId: freeTier.id,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log('Database seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
