"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

const tabs = [
  { href: "/database", label: "Database" },
  { href: "/collection", label: "Collection" },
  { href: "/decks", label: "Decks" },
  { href: "/sell", label: "Sell Advisor" },
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
    router.push("/database");
    router.refresh();
  }

  return (
    <nav className="hidden border-b border-[var(--border)] bg-[var(--surface)] md:block">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/database" className="text-lg font-bold text-[var(--accent)]">DigiCollect</Link>
        <div className="flex items-center gap-6">
          {tabs.map((tab) => {
            const isActive = pathname.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href} className={`text-sm transition-colors ${isActive ? "text-[var(--accent)] border-b-2 border-[var(--accent)] pb-1" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>{tab.label}</Link>
            );
          })}
          {user ? (
            <button onClick={handleSignOut} className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Sign Out</button>
          ) : (
            <Link href="/login" className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm text-white hover:bg-[var(--accent-hover)]">Sign In</Link>
          )}
        </div>
      </div>
    </nav>
  );
}
