"use client";

import BottomTabBar from "./bottom-tab-bar";
import TopNavBar from "./top-nav-bar";
import Footer from "./footer";
import { usePanelContext } from "@/contexts/panel-context";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { isPanelOpen } = usePanelContext();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNavBar />
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
