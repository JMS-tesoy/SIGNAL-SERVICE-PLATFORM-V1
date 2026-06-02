'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Shield,
  Zap,
  Users,
  BarChart3,
  Clock,
  Check,
  ArrowRight,
  AlertCircle,
  Loader2,
  Lock,
  Gift,
  Radio,
  Menu,
  X
} from 'lucide-react';
import { subscriptionApi, type SubscriptionTierResponse } from '@/lib/api';

function formatSignals(limit: number) {
  return limit === -1 ? 'Unlimited signals/day' : `${limit} signals/day`;
}

function formatDelay(seconds: number) {
  return seconds === 0 ? 'Instant delivery' : `${seconds}s signal delay`;
}

function getPlanSummary(plan: SubscriptionTierResponse) {
  if (plan.name === 'free') return 'Demo Receiver testing';
  if (plan.name === 'basic') return 'Individual live copying';
  if (plan.name === 'pro') return 'Active trader copying';
  if (plan.name === 'premium') return 'Professional receiver operations';
  return plan.description || 'MT5 signal access';
}

function getPlanFeatures(plan: SubscriptionTierResponse) {
  return [
    formatSignals(plan.maxSignalsPerDay),
    `${plan.maxSlaveAccounts} Receiver account${plan.maxSlaveAccounts === 1 ? '' : 's'}`,
    plan.capabilities.canAddMasterAccount ? 'Sender account included' : 'Receiver only',
    plan.capabilities.canUseLiveAccounts ? 'Demo and Live accounts' : 'Demo accounts only',
    formatDelay(plan.signalDelay),
  ];
}

function getMainPaidPlan(tiers: SubscriptionTierResponse[]) {
  return (
    tiers.find((tier) => tier.isPopular && tier.priceMonthly > 0) ||
    tiers.find((tier) => tier.name === 'pro') ||
    tiers.find((tier) => tier.priceMonthly > 0) ||
    null
  );
}

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pricingTiers, setPricingTiers] = useState<SubscriptionTierResponse[]>([]);
  const [pricingLoading, setPricingLoading] = useState(true);
  const [pricingError, setPricingError] = useState('');

  useEffect(() => {
    let isMounted = true;

    subscriptionApi.getTiers().then((result) => {
      if (!isMounted) return;

      if (result.data) {
        setPricingTiers(result.data.tiers);
      } else {
        setPricingError(result.error || 'Pricing plans are not available right now.');
      }

      setPricingLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background bg-mesh">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <span className="text-lg sm:text-xl font-bold text-gradient">SignalService</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-foreground-muted hover:text-foreground transition">Features</a>
            <a href="#pricing" className="text-foreground-muted hover:text-foreground transition">Pricing</a>
            <a href="#faq" className="text-foreground-muted hover:text-foreground transition">FAQ</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/login" className="hidden sm:block text-foreground-muted hover:text-foreground transition">
              Login
            </Link>
            <Link
              href="/register"
              className="btn-primary flex items-center gap-2 text-sm sm:text-base px-3 sm:px-4 py-2"
            >
              <span className="hidden sm:inline">Get Started</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-background-elevated text-foreground-muted hover:text-foreground transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-lg"
            >
              <div className="px-4 py-4 space-y-3">
                <a
                  href="#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-foreground-muted hover:text-foreground transition"
                >
                  Features
                </a>
                <a
                  href="#pricing"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-foreground-muted hover:text-foreground transition"
                >
                  Pricing
                </a>
                <a
                  href="#faq"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-foreground-muted hover:text-foreground transition"
                >
                  FAQ
                </a>
                <div className="pt-2 border-t border-border/50">
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-foreground-muted hover:text-foreground transition"
                  >
                    Login
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 sm:pt-32 pb-12 sm:pb-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-medium mb-6 sm:mb-8">
              <Zap className="w-4 h-4" />
              Real-time trading signals for MT5
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold mb-4 sm:mb-6 leading-tight">
              Trade Smarter with
              <br />
              <span className="text-gradient">Professional Signals</span>
            </h1>

            <p className="text-base sm:text-xl text-foreground-muted max-w-2xl mx-auto mb-8 sm:mb-10 px-2">
              Get instant trading signals delivered directly to your MetaTrader 5 terminal.
              Copy trades from expert providers with one-click automation.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link 
                href="/register" 
                className="btn-primary text-lg px-8 py-4 flex items-center gap-2 glow-primary"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link 
                href="#features" 
                className="btn-secondary text-lg px-8 py-4"
              >
                Learn More
              </Link>
            </div>
          </motion.div>
          
          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mt-12 sm:mt-20"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {[
              { label: 'EA Roles', value: '2' },
              { label: 'Demo Access', value: 'Free' },
              { label: 'Live Access', value: 'Paid' },
              { label: 'Plan Tiers', value: '4' },
            ].map((stat, i) => (
              <div key={i} className="card text-center p-3 sm:p-6">
                <div className="text-2xl sm:text-3xl md:text-4xl font-bold text-gradient mb-1 sm:mb-2">{stat.value}</div>
                <div className="text-foreground-muted text-sm sm:text-base">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">Why Choose SignalService?</h2>
            <p className="text-base sm:text-xl text-foreground-muted">Everything you need to succeed in trading</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {[
              {
                icon: Zap,
                title: 'Instant Signals',
                description: 'Receive signals in real-time with sub-second delivery to your MT5 terminal.',
                color: 'text-accent-yellow',
              },
              {
                icon: Shield,
                title: 'Secure & Reliable',
                description: '2FA authentication, protected API keys, and Cloud Protect checks for EA access.',
                color: 'text-accent-green',
              },
              {
                icon: BarChart3,
                title: 'Advanced Analytics',
                description: 'Track your performance with detailed reports and trading statistics.',
                color: 'text-primary',
              },
              {
                icon: Users,
                title: 'Sender and Receiver Roles',
                description: 'Use Sender accounts to publish signals and Receiver accounts to copy eligible signals.',
                color: 'text-accent-purple',
              },
              {
                icon: Clock,
                title: '24/7 Operation',
                description: 'Automated trade copying works around the clock, even while you sleep.',
                color: 'text-accent-cyan',
              },
              {
                icon: TrendingUp,
                title: 'Risk Management',
                description: 'Set your own lot sizes, stop losses, and risk parameters.',
                color: 'text-accent-red',
              },
            ].map((feature, i) => (
              <motion.div
                key={i}
                className="card hover:border-primary/50 transition-all duration-300"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                <feature.icon className={`w-12 h-12 ${feature.color} mb-4`} />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-foreground-muted">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-12 sm:py-20 px-4 sm:px-6 bg-background-secondary">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">Plans Built Around MT5 Access</h2>
            <p className="text-base sm:text-xl text-foreground-muted">
              Choose by Receiver capacity, Sender access, Demo/Live support, and signal delivery rules.
            </p>
          </div>

          {pricingLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : pricingError ? (
            <div className="card mx-auto max-w-xl text-center">
              <AlertCircle className="mx-auto mb-3 h-6 w-6 text-accent-yellow" />
              <h3 className="mb-2 text-lg font-semibold">Pricing unavailable</h3>
              <p className="text-sm text-foreground-muted">{pricingError}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-8 md:grid-cols-3">
              {[
                {
                  key: 'trial',
                  icon: Radio,
                  title: 'Trial Access',
                  price: 'Short demo trial',
                  description:
                    'Use a demo MT5 Receiver for a limited trial before funding a live workflow.',
                  features: [
                    'Demo MT5 accounts only',
                    'Receiver EA access',
                    'Live trading locked',
                    'Sender account locked',
                  ],
                  cta: 'Start Trial',
                  href: '/register',
                  popular: false,
                },
                {
                  key: 'invite',
                  icon: Gift,
                  title: 'Invite Benefits',
                  price: 'Referral rewards',
                  description:
                    'Invite new users and apply eligible rewards toward a paid signal plan when available.',
                  features: [
                    'Invite new traders',
                    'Earn account benefits when eligible',
                    'Use rewards toward paid access',
                    'Paid plan still controls Live and Sender access',
                  ],
                  cta: 'Create Account',
                  href: '/register',
                  popular: false,
                },
                (() => {
                  const paidPlan = getMainPaidPlan(pricingTiers);

                  return {
                    key: 'paid',
                    icon: Shield,
                    title: paidPlan?.displayName || 'Paid Plan',
                    price: paidPlan ? `$${paidPlan.priceMonthly.toFixed(0)}/month` : 'Paid access',
                    description:
                      paidPlan?.description ||
                      'Unlock Live MT5 account access, Sender accounts, and higher Receiver capacity.',
                    features: paidPlan
                      ? getPlanFeatures(paidPlan)
                      : [
                          'Live MT5 account access',
                          'Sender account access',
                          'More Receiver accounts',
                          'Higher signal allowance',
                        ],
                    cta: 'Choose Paid Plan',
                    href: '/register',
                    popular: true,
                  };
                })(),
              ].map((plan, i) => (
                <motion.div
                  key={plan.key}
                  className={`card relative ${plan.popular ? 'border-primary glow-primary' : ''}`}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  viewport={{ once: true }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-sm font-medium rounded-full">
                      Main Paid Plan
                    </div>
                  )}
                  <plan.icon className="mb-4 h-10 w-10 text-primary" />
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">{plan.title}</h3>
                    <p className="text-3xl font-bold">{plan.price}</p>
                    <p className="text-foreground-muted mt-2">{plan.description}</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => {
                      const locked =
                        feature.includes('locked') || feature === 'Demo accounts only';
                      const Icon = locked ? Lock : Check;

                      return (
                        <li key={feature} className="flex items-start gap-2">
                          <Icon
                            className={`w-5 h-5 flex-shrink-0 ${
                              locked ? 'text-foreground-muted' : 'text-accent-green'
                            }`}
                          />
                          <span className="text-foreground-muted">{feature}</span>
                        </li>
                      );
                    })}
                  </ul>
                  <Link
                    href={plan.href}
                    className={`block text-center py-3 rounded-lg font-semibold transition ${
                      plan.popular
                        ? 'bg-primary hover:bg-primary-hover text-white'
                        : 'bg-background-elevated hover:bg-background-tertiary border border-border'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="card-elevated border-gradient p-6 sm:p-12"
          >
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">Ready to Start Trading Smarter?</h2>
            <p className="text-base sm:text-xl text-foreground-muted mb-6 sm:mb-8">
              Create an account, connect a demo Receiver first, then upgrade when you need Sender or Live access.
            </p>
            <Link
              href="/register"
              className="btn-primary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 inline-flex items-center gap-2"
            >
              Create Free Account
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 sm:py-12 px-4 sm:px-6 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent-purple flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">SignalService</span>
          </div>
          <p className="text-foreground-muted text-sm">
            © 2024 SignalService. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="text-foreground-muted hover:text-foreground text-sm">Privacy</Link>
            <Link href="/terms" className="text-foreground-muted hover:text-foreground text-sm">Terms</Link>
            <Link href="/contact" className="text-foreground-muted hover:text-foreground text-sm">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
