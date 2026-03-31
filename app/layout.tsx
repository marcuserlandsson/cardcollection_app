import type { Metadata } from "next";
import Providers from "./providers";
import AppShell from "@/components/nav/app-shell";
import { PanelProvider } from "@/contexts/panel-context";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardBoard — TCG Collection Tracker",
  description: "Track your TCG card collection, plan decks, and find cards to sell.",
  icons: {
    icon: { url: "/favicon.svg", type: "image/svg+xml" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <Providers>
          <PanelProvider>
            <AppShell>{children}</AppShell>
          </PanelProvider>
        </Providers>
      </body>
    </html>
  );
}
