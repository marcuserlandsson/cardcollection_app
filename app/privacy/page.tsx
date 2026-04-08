import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — CardBoard",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--text-muted)]">Last updated: April 2026</p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Overview</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          CardBoard (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is committed to
          protecting your privacy. This policy explains what data we collect, why we collect it, and
          how it is stored and used.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Data We Collect</h2>
        <div className="mt-2 space-y-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          <div>
            <h3 className="font-medium text-[var(--text-primary)]">Account Information</h3>
            <p>
              When you create an account, we store your email address and a securely hashed password.
              We do not store plaintext passwords. Authentication is handled by{" "}
              <a
                href="https://supabase.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[var(--text-primary)] hover:underline"
              >
                Supabase
              </a>
              , which provides industry-standard authentication and encryption.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)]">Collection &amp; Deck Data</h3>
            <p>
              We store the card collection data, deck lists, and sell preferences you create within
              the app. This data is linked to your account and is not shared with third parties.
            </p>
          </div>
          <div>
            <h3 className="font-medium text-[var(--text-primary)]">No Tracking or Analytics</h3>
            <p>
              CardBoard does not use cookies for tracking, advertising, or analytics. The only
              cookies used are essential authentication session cookies required for login
              functionality.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">How We Use Your Data</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--text-secondary)]">
          <li>To authenticate you and maintain your session</li>
          <li>To store and display your card collection, decks, and sell list</li>
          <li>To calculate surplus cards and estimated values based on your data</li>
        </ul>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          We do not sell, rent, or share your personal data with third parties.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Data Storage &amp; Security</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Your data is stored in a Supabase-hosted PostgreSQL database with Row Level Security (RLS)
          enabled. This means each user can only access their own data at the database level.
          Authentication tokens are stored in secure, HTTP-only cookies — never in browser
          localStorage.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Data Deletion</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          You can delete your collection, decks, and sell list data at any time through the app. If
          you wish to delete your account entirely, please contact us and we will remove all
          associated data.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Third-Party Services</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          CardBoard uses the following third-party services:
        </p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--text-secondary)]">
          <li>
            <strong>Supabase</strong> — database hosting and authentication
          </li>
          <li>
            <strong>Vercel</strong> — application hosting
          </li>
        </ul>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          Card data and pricing are fetched server-side from external APIs. Your personal data is not
          sent to card data or pricing providers.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Changes to This Policy</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          We may update this privacy policy from time to time. Changes will be reflected on this page
          with an updated date.
        </p>
      </section>

      <div className="mt-10 flex gap-4 text-xs text-[var(--text-muted)]">
        <Link href="/legal" className="hover:text-[var(--text-secondary)]">
          Legal
        </Link>
        <Link href="/terms" className="hover:text-[var(--text-secondary)]">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
