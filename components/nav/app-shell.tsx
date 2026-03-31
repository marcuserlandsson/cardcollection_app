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
        className={`px-4 pb-20 pt-4 md:px-6 md:pb-6 ${
          isPanelOpen
            ? "md:mr-[400px]"
            : "mx-auto max-w-7xl"
        }`}
        style={{
          transition: "max-width 300ms ease-in-out, margin 300ms ease-in-out",
          ...(isPanelOpen ? { maxWidth: "calc(100% - 400px)" } : {}),
        }}
      >
        {children}
      </main>
      <BottomTabBar />
    </>
  );
}
