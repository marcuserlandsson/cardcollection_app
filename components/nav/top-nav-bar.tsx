"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Home, Search, Layers, SquareStack, TrendingUp, LogOut, LogIn } from "lucide-react";
import CardBoardLogo from "@/components/icons/cardboard-logo";
import type { User } from "@supabase/supabase-js";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/database", label: "Database", icon: Search },
  { href: "/collection", label: "Collection", icon: Layers },
  { href: "/decks", label: "Decks", icon: SquareStack },
  { href: "/sell", label: "Sell", icon: TrendingUp },
];

export default function TopNavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="hidden border-b border-[var(--accent-border)] bg-[var(--surface)]/80 backdrop-blur-xl md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-2.5">
        <Link href="/" className="flex items-center gap-1.5 text-lg font-bold text-[var(--text-primary)]">
          <CardBoardLogo size={20} />
          Card<span className="text-[var(--accent)]">Board</span>
        </Link>
        <div className="flex items-center gap-0.5 rounded-lg bg-[var(--elevated)] p-0.5">
          {tabs.map((tab) => {
            const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[var(--accent)] text-[var(--background)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </Link>
            );
          })}
        </div>
        {user ? (
          <button onClick={handleSignOut} className="flex items-center gap-1.5 text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]">
            <LogOut size={15} />
            Sign Out
          </button>
        ) : (
          <Link href="/login" className="flex items-center gap-1.5 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]">
            <LogIn size={15} />
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
