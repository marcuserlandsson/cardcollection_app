"use client";

import BottomTabBar from "./bottom-tab-bar";
import TopNavBar from "./top-nav-bar";
import { usePanelContext } from "@/contexts/panel-context";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isPanelOpen } = usePanelContext();

  return (
    <>
      <TopNavBar />
      <main
        className={`mx-auto max-w-7xl px-4 pb-20 pt-4 transition-transform duration-300 ease-in-out md:px-6 md:pb-6 ${
          isPanelOpen ? "md:-translate-x-[200px]" : ""
        }`}
      >
        {children}
      </main>
      <BottomTabBar />
    </>
  );
}
