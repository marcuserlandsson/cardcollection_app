"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import GuestLanding from "@/components/dashboard/guest-landing";
import DashboardStats from "@/components/dashboard/dashboard-stats";
import DeckProgress from "@/components/dashboard/deck-progress";
import WorthSelling from "@/components/dashboard/worth-selling";
import type { User } from "@supabase/supabase-js";

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setAuthChecked(true);
    });
  }, [supabase.auth]);

  if (!authChecked) return null;

  if (!user) return <GuestLanding />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <DashboardStats />
      <div className="grid gap-4 md:grid-cols-2">
        <DeckProgress />
        <WorthSelling />
      </div>
    </div>
  );
}
