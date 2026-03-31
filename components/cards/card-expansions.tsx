"use client";

import { useCardExpansions } from "@/lib/hooks/use-cards";

interface CardExpansionsProps {
  cardNumber: string;
}

export default function CardExpansions({ cardNumber }: CardExpansionsProps) {
  const { data: expansions } = useCardExpansions(cardNumber);

  if (!expansions || expansions.length === 0) return null;

  return (
    <div className="mt-3 rounded-lg bg-[var(--elevated)] p-3">
      <div className="mb-2 text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">Expansions</div>
      <div className="flex flex-wrap gap-1.5">
        {expansions.map((exp) => (
          <span
            key={exp.expansion}
            className="rounded-md bg-[var(--surface)] px-2.5 py-1 text-xs font-medium text-[var(--text-secondary)]"
          >
            {exp.expansion}
          </span>
        ))}
      </div>
    </div>
  );
}
