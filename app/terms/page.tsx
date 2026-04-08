import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — CardBoard",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated: April 2026</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Acceptance of Terms</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          By accessing or using CardBoard, you agree to be bound by these Terms of Service. If you
          do not agree to these terms, please do not use the service.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Description of Service</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          CardBoard is a free, fan-made tool for tracking trading card game collections, planning
          decks, and identifying cards to sell. The service displays card data and estimated pricing
          sourced from third-party providers.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">User Accounts</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--text-secondary)]">
          <li>You must provide a valid email address to create an account</li>
          <li>You are responsible for maintaining the security of your account credentials</li>
          <li>You may not share your account with others or create multiple accounts</li>
          <li>We reserve the right to suspend accounts that violate these terms</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Acceptable Use</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          You agree not to:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--text-secondary)]">
          <li>Use automated scripts, bots, or scrapers to access the service</li>
          <li>Attempt to access other users&apos; data or accounts</li>
          <li>Use the service for any unlawful purpose</li>
          <li>Interfere with or disrupt the service or its infrastructure</li>
          <li>Redistribute card images or data obtained through the service</li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Intellectual Property</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Card images, names, and game data are the property of Bandai Co., Ltd. and their
          respective copyright holders. CardBoard does not claim ownership of any card-related
          intellectual property. See our{" "}
          <Link href="/legal" className="text-[var(--text-primary)] hover:underline">
            Legal page
          </Link>{" "}
          for full trademark and attribution details.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Pricing Data Disclaimer</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          All card prices shown are estimates based on third-party marketplace data, updated
          periodically. CardBoard does not guarantee the accuracy of pricing information. Users
          should verify current prices on the respective marketplace (Cardtrader, Cardmarket) before
          making financial decisions. CardBoard is not responsible for any financial loss resulting
          from reliance on displayed prices.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Limitation of Liability</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          CardBoard is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without
          warranties of any kind. To the maximum extent permitted by law, CardBoard shall not be
          liable for any indirect, incidental, special, consequential, or punitive damages, or any
          loss of profits or data, arising out of your use of the service.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Service Availability</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          We strive to keep CardBoard available but do not guarantee uninterrupted access. The
          service may be temporarily unavailable for maintenance, updates, or circumstances beyond
          our control.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Changes to Terms</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          We may modify these terms at any time. Continued use of the service after changes
          constitutes acceptance of the updated terms.
        </p>
      </section>

      <div className="mt-10 flex gap-4 text-xs text-[var(--text-muted)]">
        <Link href="/legal" className="hover:text-[var(--text-secondary)]">
          Legal
        </Link>
        <Link href="/privacy" className="hover:text-[var(--text-secondary)]">
          Privacy Policy
        </Link>
      </div>
    </div>
  );
}
