"use client";

import { useState } from "react";
import Image from "next/image";
import type { Expansion } from "@/lib/types";

interface ExpansionGridProps {
  expansions: Expansion[];
  setImages: Record<string, string>;
  onSelect: (expansion: Expansion) => void;
}

const TABS = [
  { key: "booster", label: "Boosters" },
  { key: "extra", label: "Extra" },
  { key: "starter", label: "Starters" },
  { key: "other", label: "Other" },
] as const;

function getTab(code: string): string {
  if (/^BT-?\d/.test(code)) return "booster";
  if (/^EX-?\d/.test(code)) return "extra";
  if (/^ST-?\d/.test(code)) return "starter";
  return "other";
}

export default function ExpansionGrid({ expansions, setImages, onSelect }: ExpansionGridProps) {
  const [activeTab, setActiveTab] = useState("booster");

  const grouped = expansions.reduce<Record<string, Expansion[]>>((acc, exp) => {
    const tab = getTab(exp.code);
    (acc[tab] ??= []).push(exp);
    return acc;
  }, {});

  const visibleExpansions = grouped[activeTab] || [];

  return (
    <div className="space-y-4">
      <div className="flex gap-6 border-b border-[var(--border)]">
        {TABS.map((tab) => {
          const count = (grouped[tab.key] || []).length;
          if (count === 0) return null;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "border-b-2 border-[var(--accent)] text-[var(--text-primary)]"
                  : "border-b-2 border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs text-[var(--text-muted)]">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {visibleExpansions.map((exp) => {
          const imageUrl = setImages[exp.code];
          return (
            <button
              key={exp.code}
              onClick={() => onSelect(exp)}
              className="group overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] transition-transform duration-200 hover:scale-[1.03]"
            >
              {imageUrl ? (
                <div className="relative aspect-square w-full overflow-hidden bg-[var(--elevated)]">
                  <Image
                    src={imageUrl}
                    alt={exp.code}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 20vw"
                    className="object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="flex aspect-square w-full items-center justify-center bg-[var(--elevated)]">
                  <span className="text-2xl font-bold text-[var(--text-dim)]">{exp.code}</span>
                </div>
              )}
              <div className="p-3">
                <div className="text-sm font-bold text-[var(--text-primary)]">{exp.code}</div>
                <div className="text-xs text-[var(--text-muted)]">{exp.card_count} cards</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
