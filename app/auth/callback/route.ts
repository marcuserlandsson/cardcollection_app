import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/database";

  // Prevent open redirect — only allow relative paths starting with /
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/database";

  // Use the app's own origin from env, not the request origin
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}?confirmed=true`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
