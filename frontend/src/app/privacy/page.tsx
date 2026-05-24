import type { Metadata } from "next";
import { LegalPageShell, LegalSection } from "@/components/LegalPageShell";

export const metadata: Metadata = {
  title: "Privacy Policy | Signal Service",
  description: "Privacy Policy for SignalService.",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      eyebrow="Privacy"
      title="Privacy Policy"
      description="This policy summarizes what data SignalService collects, why it is used, and how it is protected."
    >
      <LegalSection title="Information We Collect">
        <p>
          We may collect account information such as name, email, authentication settings, subscription status, payment references, MT5 account metadata, and signal activity needed to operate the service.
        </p>
      </LegalSection>

      <LegalSection title="How We Use Information">
        <p>
          We use information to authenticate users, deliver trading signals, manage subscriptions, provide support, improve reliability, prevent abuse, and comply with legal or security obligations.
        </p>
      </LegalSection>

      <LegalSection title="Payments">
        <p>
          Payment details are processed by our payment provider. We store billing references and subscription state, not full card numbers.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use access controls, secure transport, authentication tokens, and verification flows to help protect account data. No online service can guarantee perfect security.
        </p>
      </LegalSection>

      <LegalSection title="Data Sharing">
        <p>
          We share data with service providers only when needed for platform operations, such as hosting, email delivery, SMS, payments, analytics, or support.
        </p>
      </LegalSection>

      <LegalSection title="Your Choices">
        <p>
          You may update account details in the dashboard where available. For account deletion or data requests, contact support through the contact page.
        </p>
      </LegalSection>
    </LegalPageShell>
  );
}
