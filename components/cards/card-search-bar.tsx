"use client";

import { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface CardSearchBarProps {
  onSearch: (query: string) => void;
}

export default function CardSearchBar({ onSearch }: CardSearchBarProps) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const timeout = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(timeout);
  }, [value, onSearch]);

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-3.5 py-2.5">
      <Search size={16} className="flex-shrink-0 text-[var(--text-dim)]" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search cards by name or number..."
        className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-dim)] outline-none"
      />
    </div>
  );
}
