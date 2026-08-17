"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GuestLanding from "@/components/dashboard/guest-landing";
import DashboardStats from "@/components/dashboard/dashboard-stats";
import DeckProgress from "@/components/dashboard/deck-progress";
import WorthSelling from "@/components/dashboard/worth-selling";
import { useGame } from "@/contexts/game-context";
import type { User } from "@supabase/supabase-js";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const { game } = useGame();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  if (!authChecked) return null;

  if (!user) return <GuestLanding />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <DashboardStats />
      <div className={`grid gap-4 ${game.hasPrices ? "md:grid-cols-2" : ""}`}>
        <DeckProgress />
        {game.hasPrices && <WorthSelling />}
      </div>
    </div>
  );
}
