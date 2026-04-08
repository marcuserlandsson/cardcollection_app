"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatPrice } from "@/lib/utils";
import type { PriceHistoryEntry } from "@/lib/types";

interface PriceSparklineProps {
  history: PriceHistoryEntry[];
}

function SparklineTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { date: string; price: number } }> }) {
  if (!active || !payload?.[0]) return null;
  const { date, price } = payload[0].payload;
  return (
    <div className="rounded-md bg-[var(--elevated)] border border-[var(--border)] px-2 py-1 text-xs shadow-lg">
      <div className="text-[var(--text-muted)]">{date}</div>
      <div className="font-medium text-[var(--green)]">{formatPrice(price)}</div>
    </div>
  );
}

export default function PriceSparkline({ history }: PriceSparklineProps) {
  const data = useMemo(() => {
    return history
      .filter((h) => h.price_trend !== null)
      .sort((a, b) => a.recorded_at.localeCompare(b.recorded_at))
      .map((h) => ({
        date: new Date(h.recorded_at).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
        }),
        price: h.price_trend!,
      }));
  }, [history]);

  if (data.length < 2) return null;

  return (
    <div className="mt-2 h-[60px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <Tooltip
            content={<SparklineTooltip />}
            cursor={false}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="var(--green)"
            strokeWidth={1.5}
            dot={false}
            activeDot={{ r: 3, fill: "var(--green)" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
