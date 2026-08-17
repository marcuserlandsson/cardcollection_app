"use client";

import Link from "next/link";
import BottomTabBar from "./bottom-tab-bar";
import TopNavBar from "./top-nav-bar";
import Footer from "./footer";
import CardBoardLogo from "@/components/icons/cardboard-logo";
import GameSwitcher from "@/components/nav/game-switcher";
import { usePanelContext } from "@/contexts/panel-context";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isPanelOpen } = usePanelContext();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNavBar />
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-4 py-2 backdrop-blur-xl md:hidden">
        <Link href="/" className="flex items-center gap-1.5 text-base font-bold text-[var(--text-primary)]">
          <CardBoardLogo size={28} className="shrink-0" />
          <span>Card<span className="text-[var(--accent)]">Board</span></span>
        </Link>
        <GameSwitcher />
      </header>
      <div className="flex flex-1 justify-center">
        <main
          className="w-full max-w-7xl px-4 pb-20 pt-4 md:px-6 md:pb-6"
          style={{
            marginRight: isPanelOpen ? 400 : 0,
            transition: "margin-right 300ms cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {children}
        </main>
      </div>
      <Footer />
      <BottomTabBar />
    </div>
  );
}
