import Link from "next/link";
import { Layers, SquareStack, TrendingUp } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Track your collection",
    description: "card counts, estimated value, and completion stats.",
    color: "var(--accent)",
  },
  {
    icon: SquareStack,
    title: "Build and complete decks",
    description: "see what you're missing and what you have.",
    color: "var(--blue)",
  },
  {
    icon: TrendingUp,
    title: "Find surplus to sell",
    description: "live Cardmarket pricing on extra copies.",
    color: "var(--yellow)",
  },
];

export default function GuestLanding() {
  return (
    <div className="px-4 py-12 md:py-20">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl font-bold leading-tight md:text-4xl">
          Track your<br />
          <span className="text-[var(--accent)]">Digimon TCG</span> collection
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-[var(--text-secondary)]">
          Build decks, track completion, and find surplus cards worth selling on Cardmarket.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-[var(--accent)] px-5 py-2.5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
          >
            Get Started
          </Link>
          <Link
            href="/database"
            className="text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
          >
            Browse Database &rarr;
          </Link>
        </div>
        <div className="mt-12 space-y-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div key={feature.title} className="flex items-start gap-3">
                <Icon size={18} className="mt-0.5 flex-shrink-0" style={{ color: feature.color }} />
                <p className="text-sm">
                  <span className="font-medium">{feature.title}</span>
                  <span className="text-[var(--text-muted)]"> — {feature.description}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
