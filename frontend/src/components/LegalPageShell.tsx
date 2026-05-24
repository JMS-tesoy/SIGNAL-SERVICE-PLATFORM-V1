import Link from "next/link";
import { ArrowLeft, TrendingUp } from "lucide-react";

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function LegalPageShell({
  eyebrow,
  title,
  description,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-background bg-mesh px-4 py-8 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent-purple">
              <TrendingUp className="h-5 w-5 text-white" />
            </span>
            <span className="font-bold text-gradient">SignalService</span>
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-foreground-muted transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Home
          </Link>
        </header>

        <section className="mb-8 rounded-xl border border-border bg-background-secondary/90 p-6 shadow-xl shadow-black/10 backdrop-blur sm:p-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {eyebrow}
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{title}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground-muted">
            {description}
          </p>
        </section>

        <article className="space-y-6 rounded-xl border border-border bg-background-secondary/90 p-6 shadow-xl shadow-black/10 backdrop-blur sm:p-8">
          {children}
        </article>
      </div>
    </main>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold">{title}</h2>
      <div className="space-y-3 text-sm leading-6 text-foreground-muted">{children}</div>
    </section>
  );
}
