"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/database", label: "Database" },
  { href: "/collection", label: "Collection" },
  { href: "/decks", label: "Decks" },
  { href: "/sell", label: "Sell Advisor" },
];

export default function TopNavBar() {
  const pathname = usePathname();

  return (
    <nav className="hidden border-b border-[var(--border)] bg-[var(--surface)] md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/database" className="text-lg font-bold text-[var(--accent)]">
          DigiCollect
        </Link>
        <div className="flex gap-6">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`text-sm transition-colors ${
                  isActive
                    ? "text-[var(--accent)] border-b-2 border-[var(--accent)] pb-1"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
