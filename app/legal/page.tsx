import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Legal — CardBoard",
};

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl py-8">
      <h1 className="text-2xl font-bold">Legal Information</h1>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Trademark Disclaimer</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Digimon, Digimon Card Game, and all related card names, artwork, images, and game
          mechanics are trademarks and copyrights of Bandai Co., Ltd. and its licensors. All card
          images displayed on this site are sourced from official Bandai channels and are the
          property of their respective copyright holders.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          CardBoard is a fan-made, independent collection tracking tool. It is not affiliated with,
          endorsed by, sponsored by, or produced by Bandai Co., Ltd., Bandai Namco Entertainment, or
          any of their subsidiaries or affiliates.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Card Images &amp; Fair Use</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          Card images are displayed for the purpose of identifying cards in users&apos; personal
          collections and are served directly from official sources (digimoncard.io,
          world.digimoncard.com). Images are not hosted, modified, or redistributed by CardBoard.
          This use is intended as fair use for informational and personal reference purposes.
        </p>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          If you are a rights holder and believe your intellectual property is being used
          incorrectly, please contact us and we will promptly address your concerns.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Data Sources &amp; Attribution</h2>
        <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-[var(--text-secondary)]">
          <li>
            Card data provided by the{" "}
            <a
              href="https://digimoncard.io"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-primary)] hover:underline"
            >
              Digimon Card API
            </a>
          </li>
          <li>
            Pricing data sourced from{" "}
            <a
              href="https://www.cardtrader.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-primary)] hover:underline"
            >
              Cardtrader
            </a>{" "}
            and{" "}
            <a
              href="https://www.cardmarket.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--text-primary)] hover:underline"
            >
              Cardmarket
            </a>
          </li>
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Price Disclaimer</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          All card prices displayed on CardBoard are estimates based on marketplace data and are
          provided for informational purposes only. Prices are updated periodically and may not
          reflect current market conditions. CardBoard does not guarantee the accuracy, completeness,
          or timeliness of pricing data. Always verify prices on the respective marketplace before
          making buying or selling decisions.
        </p>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Liability Limitation</h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
          CardBoard is provided &ldquo;as is&rdquo; without warranties of any kind, either express
          or implied. CardBoard shall not be liable for any financial losses, trading decisions, or
          other damages arising from the use of pricing data or other information provided through
          this service.
        </p>
      </section>

      <div className="mt-10 flex gap-4 text-xs text-[var(--text-muted)]">
        <Link href="/privacy" className="hover:text-[var(--text-secondary)]">
          Privacy Policy
        </Link>
        <Link href="/terms" className="hover:text-[var(--text-secondary)]">
          Terms of Service
        </Link>
      </div>
    </div>
  );
}
