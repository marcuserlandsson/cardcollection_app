import type { Metadata } from "next";
import Providers from "./providers";
import AppShell from "@/components/nav/app-shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "CardBoard — TCG Collection Tracker",
  description: "Track your TCG card collection, plan decks, and find cards to sell.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
