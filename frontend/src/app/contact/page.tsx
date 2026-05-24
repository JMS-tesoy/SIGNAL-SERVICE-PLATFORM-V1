import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, ShieldCheck } from "lucide-react";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Contact | Signal Service",
  description: "Contact SignalService support.",
};

export default function ContactPage() {
  return (
    <LegalPageShell
      eyebrow="Support"
      title="Contact SignalService"
      description="Use this page for billing, account access, MT5 setup, signal delivery, and security questions."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          {
            icon: Mail,
            title: "Email support",
            body: "For account, billing, and general product questions.",
          },
          {
            icon: MessageSquare,
            title: "Technical help",
            body: "For MT5 account setup, signal delivery, and dashboard issues.",
          },
          {
            icon: ShieldCheck,
            title: "Security",
            body: "For login, 2FA, and account protection concerns.",
          },
        ].map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-background/60 p-4">
            <item.icon className="mb-3 h-5 w-5 text-primary" />
            <h2 className="mb-1 font-semibold">{item.title}</h2>
            <p className="text-sm leading-6 text-foreground-muted">{item.body}</p>
          </div>
        ))}
      </div>

      <LegalSection title="How To Reach Us">
        <p>
          Add your support email address here before launch, then connect this page to your ticketing or email workflow.
        </p>
        <p>
          Temporary support path:{" "}
          <Link href="/dashboard/settings" className="font-medium text-primary hover:underline">
            dashboard settings
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="What To Include">
        <p>
          For faster help, include your account email, the affected MT5 account, screenshots if relevant, and the approximate time the issue happened.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
