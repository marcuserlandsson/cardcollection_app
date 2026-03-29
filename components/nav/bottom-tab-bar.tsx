"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Search, Layers, SquareStack, TrendingUp } from "lucide-react";

const tabs = [
  { href: "/database", label: "Database", icon: Search },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/decks", label: "Decks", icon: SquareStack },
  { href: "/sell", label: "Sell", icon: TrendingUp },
];

export default function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl md:hidden">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs transition-colors ${
              isActive
                ? "text-[var(--accent)]"
                : "text-[var(--text-dim)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <Icon size={20} />
            <span className="font-medium">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
