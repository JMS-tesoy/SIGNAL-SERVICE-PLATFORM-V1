import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Terms of Service | Signal Service",
  description: "Terms of Service for SignalService.",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      eyebrow="Legal"
      title="Terms of Service"
      description="These terms explain the rules for using SignalService, including account access, subscriptions, and trading signal usage."
    >
      <LegalSection title="1. Acceptance">
        <p>
          By creating an account or using SignalService, you agree to these terms and any policies referenced here.
        </p>
      </LegalSection>

      <LegalSection title="2. Trading Risk">
        <p>
          Trading involves risk. Signals, analytics, and automation tools are provided for informational and operational use only. They are not financial advice, and past performance does not guarantee future results.
        </p>
      </LegalSection>

      <LegalSection title="3. Account Responsibilities">
        <p>
          You are responsible for keeping your login credentials, connected trading accounts, API access, and two-factor authentication methods secure.
        </p>
      </LegalSection>

      <LegalSection title="4. Subscriptions And Billing">
        <p>
          Paid features may require an active subscription. Billing, renewals, cancellations, and payment processing are handled through our payment provider.
        </p>
      </LegalSection>

      <LegalSection title="5. Acceptable Use">
        <p>
          Do not abuse, reverse engineer, overload, resell, or interfere with the platform, APIs, signal delivery systems, or connected services.
        </p>
      </LegalSection>

      <LegalSection title="6. Service Changes">
        <p>
          We may update features, limits, pricing, or these terms as the product evolves. Continued use after updates means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="7. Contact">
        <p>
          Questions about these terms can be sent through the contact page.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
