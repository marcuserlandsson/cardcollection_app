"use client";

import BottomTabBar from "./bottom-tab-bar";
import TopNavBar from "./top-nav-bar";
import { usePanelContext } from "@/contexts/panel-context";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isPanelOpen } = usePanelContext();

  return (
    <>
      <TopNavBar />
      <div className="flex justify-center">
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
      <BottomTabBar />
    </>
  );
}
