"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Activity, CheckCircle2, ShieldCheck, TrendingUp, Zap } from "lucide-react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: AuthShellProps) {
  return (
    <main className="min-h-screen bg-background bg-mesh px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="grid w-full overflow-hidden rounded-xl border border-border bg-background-secondary/90 shadow-2xl shadow-black/20 backdrop-blur lg:grid-cols-[1fr_0.86fr]"
        >
          <section className="px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <Link href="/" className="mb-8 inline-flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-purple shadow-lg shadow-sky-500/10">
                <TrendingUp className="h-6 w-6 text-white" />
              </span>
              <span className="text-xl font-bold text-gradient">SignalService</span>
            </Link>

            <div className="mb-7">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                {eyebrow}
              </p>
              <h1 className="text-2xl font-bold leading-tight sm:text-3xl">{title}</h1>
              <p className="mt-2 max-w-md text-sm leading-6 text-foreground-muted">
                {description}
              </p>
            </div>

            {children}

            {footer && <div className="mt-7 border-t border-border pt-5">{footer}</div>}
          </section>

          <aside className="hidden border-l border-border bg-background/70 p-8 lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <Activity className="h-4 w-4" />
                Live signal workspace
              </div>
              <h2 className="max-w-sm text-3xl font-bold leading-tight">
                Secure access for every signal, account, and subscription.
              </h2>
              <p className="mt-4 max-w-sm text-sm leading-6 text-foreground-muted">
                Manage MT5 accounts, monitor delivery, and keep billing under control from one focused dashboard.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: ShieldCheck, label: "Protected sign-in and 2FA flows" },
                { icon: Zap, label: "Fast access to real-time signal tools" },
                { icon: CheckCircle2, label: "Designed for repeat daily workflows" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background-secondary/70 p-3"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span className="text-sm text-foreground-muted">{item.label}</span>
                </div>
              ))}
            </div>
          </aside>
        </motion.div>
      </div>
    </main>
  );
}

export function AuthError({ message }: { message: string }) {
  if (!message) return null;

  return (
    <div className="rounded-lg border border-accent-red/25 bg-accent-red/10 px-4 py-3 text-sm text-accent-red">
      {message}
    </div>
  );
}

export function AuthFooterLink({
  label,
  href,
  action,
}: {
  label: string;
  href: string;
  action: string;
}) {
  return (
    <p className="text-center text-sm text-foreground-muted">
      {label}{" "}
      <Link href={href} className="font-medium text-primary hover:underline">
        {action}
      </Link>
    </p>
  );
}
