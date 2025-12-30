'use client';

import { useState } from 'react';
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
  Menu,
  X
} from 'lucide-react';

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
              { label: 'Active Traders', value: '10,000+' },
              { label: 'Signals Daily', value: '500+' },
              { label: 'Success Rate', value: '78%' },
              { label: 'Countries', value: '50+' },
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
                description: '2FA authentication, encrypted connections, and 99.9% uptime guarantee.',
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
                title: 'Expert Providers',
                description: 'Follow verified signal providers with proven track records.',
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
            <h2 className="text-2xl sm:text-4xl font-bold mb-3 sm:mb-4">Simple, Transparent Pricing</h2>
            <p className="text-base sm:text-xl text-foreground-muted">Start free, upgrade when you're ready</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8">
            {[
              {
                name: 'Free',
                price: '$0',
                period: 'forever',
                description: 'Perfect for getting started',
                features: ['5 signals/day', '1 MT5 account', '60s signal delay', 'Basic dashboard'],
                cta: 'Get Started',
                popular: false,
              },
              {
                name: 'Basic',
                price: '$29',
                period: '/month',
                description: 'For individual traders',
                features: ['50 signals/day', '2 MT5 accounts', '30s signal delay', 'Signal history', 'Email support'],
                cta: 'Subscribe',
                popular: false,
              },
              {
                name: 'Pro',
                price: '$79',
                period: '/month',
                description: 'Best for active traders',
                features: ['Unlimited signals', '5 MT5 accounts', '5s signal delay', 'Advanced analytics', 'Priority support', 'API access'],
                cta: 'Subscribe',
                popular: true,
              },
              {
                name: 'Premium',
                price: '$199',
                period: '/month',
                description: 'For professional operations',
                features: ['Unlimited signals', '20 MT5 accounts', 'Instant signals', 'Custom reports', 'Dedicated support', 'White-label'],
                cta: 'Contact Sales',
                popular: false,
              },
            ].map((plan, i) => (
              <motion.div
                key={i}
                className={`card relative ${plan.popular ? 'border-primary glow-primary' : ''}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                viewport={{ once: true }}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-foreground-muted">{plan.period}</span>
                  </div>
                  <p className="text-foreground-muted mt-2">{plan.description}</p>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-accent-green" />
                      <span className="text-foreground-muted">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
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
              Join thousands of traders receiving professional signals every day.
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
            <a href="#" className="text-foreground-muted hover:text-foreground text-sm">Privacy</a>
            <a href="#" className="text-foreground-muted hover:text-foreground text-sm">Terms</a>
            <a href="#" className="text-foreground-muted hover:text-foreground text-sm">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
