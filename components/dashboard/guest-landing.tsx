import Link from "next/link";
import { Layers, SquareStack, TrendingUp, LogIn, Search } from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "Track Your Collection",
    description: "Keep count of every card you own and see your collection's estimated value.",
    color: "var(--accent)",
  },
  {
    icon: SquareStack,
    title: "Build & Complete Decks",
    description: "Create deck lists and track which cards you still need to finish them.",
    color: "var(--blue)",
  },
  {
    icon: TrendingUp,
    title: "Find Cards to Sell",
    description: "Identify surplus cards worth selling on Cardmarket with live pricing.",
    color: "var(--yellow)",
  },
];

export default function GuestLanding() {
  return (
    <div className="flex flex-col items-center px-4 py-12 md:py-20">
      <h1 className="text-center text-3xl font-bold md:text-4xl">
        Track your <span className="text-[var(--accent)]">Digimon TCG</span> collection
      </h1>
      <p className="mt-3 max-w-md text-center text-[var(--text-secondary)]">
        Build decks, track completion, and find surplus cards worth selling — all in one place.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/login"
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)]"
        >
          <LogIn size={16} />
          Get Started
        </Link>
        <Link
          href="/database"
          className="flex items-center gap-2 rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-6 py-3 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Search size={16} />
          Browse Card Database
        </Link>
      </div>
      <div className="mt-16 grid w-full max-w-3xl gap-4 sm:grid-cols-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <div
              key={feature.title}
              className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6 text-center"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--elevated)]"
                style={{ color: feature.color }}
              >
                <Icon size={22} />
              </div>
              <h3 className="mt-3 font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-sm text-[var(--text-muted)]">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
