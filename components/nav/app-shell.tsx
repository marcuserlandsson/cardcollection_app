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
        className={`mx-auto max-w-7xl px-4 pb-20 pt-4 transition-[margin] duration-300 md:px-6 md:pb-6 ${
          isPanelOpen ? "md:mr-[400px] md:ml-0" : ""
        }`}
      >
        {children}
      </main>
      <BottomTabBar />
    </>
  );
}
