import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getCardImageUrl } from "@/lib/utils";
import { computeImageLayout, IMAGE_CAP } from "@/lib/share-image";
import type { SellSharePayloadItem } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_sell_share", { p_token: token });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) {
    return new Response("Not found", { status: 404 });
  }

  const allItems = (row.payload as SellSharePayloadItem[]) ?? [];
  const sorted = [...allItems].sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  const layout = computeImageLayout(sorted.length);
  const items = sorted.slice(0, IMAGE_CAP);
  const title: string = row.title || "Cards for sale";
  const origin = new URL(req.url).origin;
  const footerLeft =
    `${origin}/s/${token} · asking prices set by seller` +
    (layout.remaining > 0 ? ` · +${layout.remaining} more at the link` : "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0b0d12",
          color: "#e8ebf2",
          padding: 32,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            borderBottom: "1px solid #262b38",
            paddingBottom: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 700 }}>{title}</div>
          {row.contact_note ? (
            <div style={{ fontSize: 18, color: "#9aa3b4", marginTop: 4 }}>{row.contact_note}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, flex: 1, alignContent: "flex-start" }}>
          {items.map((item) => {
            const src = item.image_url ?? getCardImageUrl(item.card_number);
            return (
              <div
                key={item.card_number}
                style={{
                  display: "flex",
                  width: 152,
                  height: 213,
                  position: "relative",
                  borderRadius: 8,
                  overflow: "hidden",
                  background: "#1a1f2b",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} width={152} height={213} style={{ objectFit: "cover" }} alt="" />
                <div
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    display: "flex",
                    background: "rgba(11,13,18,0.8)",
                    borderRadius: 999,
                    padding: "2px 8px",
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  {`×${item.quantity}`}
                </div>
                <div
                  style={{
                    position: "absolute",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    justifyContent: "center",
                    background: "rgba(11,13,18,0.85)",
                    padding: "3px 0",
                    fontSize: 18,
                    fontWeight: 700,
                    color: "#5fd0a6",
                  }}
                >
                  {item.price !== null ? `€${item.price.toFixed(2)}` : "—"}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #262b38",
            paddingTop: 10,
            marginTop: 12,
            fontSize: 16,
            color: "#7c8597",
          }}
        >
          <div style={{ display: "flex" }}>{footerLeft}</div>
          <div style={{ display: "flex", color: "#2dd4a8", fontWeight: 700 }}>made with CardBoard</div>
        </div>
      </div>
    ),
    { width: layout.width, height: layout.height },
  );
}
