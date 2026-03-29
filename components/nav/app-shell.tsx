import BottomTabBar from "./bottom-tab-bar";
import TopNavBar from "./top-nav-bar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopNavBar />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-4 md:px-6 md:pb-6">
        {children}
      </main>
      <BottomTabBar />
    </>
  );
}
