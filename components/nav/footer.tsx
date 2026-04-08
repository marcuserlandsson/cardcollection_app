"use client";

import Link from "next/link";
import { usePanelContext } from "@/contexts/panel-context";

export default function Footer() {
  const year = new Date().getFullYear();
  const { isPanelOpen } = usePanelContext();

  return (
    <footer
      className="border-t border-[var(--border)] bg-[var(--surface)] pb-20 md:pb-0"
      style={{
        marginRight: isPanelOpen ? 400 : 0,
        transition: "margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <div className="mx-auto max-w-7xl px-4 py-4 md:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          {/* Attribution */}
          <div className="max-w-2xl text-xs leading-relaxed text-[var(--text-dim)]">
            <p>
              Digimon and all related card images, names, and artwork are trademarks of{" "}
              <span className="text-[var(--text-muted)]">Bandai Co., Ltd.</span> CardBoard is a
              fan-made collection tracker and is not affiliated with, endorsed by, or produced by
              Bandai. Card data from{" "}
              <a href="https://digimoncard.io" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">digimoncard.io</a>
              . Pricing from{" "}
              <a href="https://www.cardtrader.com" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Cardtrader</a>
              {" "}&amp;{" "}
              <a href="https://www.cardmarket.com" target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Cardmarket</a>
              . Prices are estimates and may not reflect current market value.
            </p>
          </div>

          {/* Links */}
          <div className="flex shrink-0 gap-5 text-xs">
            <Link href="/legal" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Legal</Link>
            <Link href="/privacy" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Privacy</Link>
            <Link href="/terms" className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Terms</Link>
          </div>
        </div>

        <div className="mt-2 text-xs text-[var(--text-dim)]">
          &copy; {year} CardBoard
        </div>
      </div>
    </footer>
  );
}
