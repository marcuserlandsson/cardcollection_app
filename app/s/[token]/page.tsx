import { notFound } from "next/navigation";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PublicSellList from "@/components/share/public-sell-list";
import type { SellSharePayloadItem } from "@/lib/types";

interface SharePageProps {
  params: Promise<{ token: string }>;
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sell_share", { p_token: token });

  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) notFound();

  const items = (row.payload as SellSharePayloadItem[]) ?? [];
  const title = row.title || "Cards for sale";

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {row.contact_note && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-[var(--text-secondary)]">
            <Mail size={14} />
            {row.contact_note}
          </p>
        )}
      </div>

      <PublicSellList items={items} />

      <div className="flex items-center justify-between border-t border-[var(--border)] pt-3 text-xs text-[var(--text-muted)]">
        <span>Prices via Cardmarket</span>
        <a href="/" className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
          Shared from CardBoard →
        </a>
      </div>
    </div>
  );
}
