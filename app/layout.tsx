import type { Metadata } from "next";
import Providers from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "DigiCollect — Digimon TCG Collection Tracker",
  description: "Track your Digimon TCG card collection, plan decks, and find cards to sell.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[var(--background)] text-[var(--text-primary)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
