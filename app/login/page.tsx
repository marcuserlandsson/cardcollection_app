"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("Check your email for a confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push("/database");
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Card<span className="text-[var(--accent)]">Board</span></h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">{isSignUp ? "Create an account" : "Sign in to your account"}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-3.5 py-2.5">
            <Mail size={16} className="flex-shrink-0 text-[var(--text-dim)]" />
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required className="w-full bg-transparent text-sm outline-none placeholder-[var(--text-dim)]" />
          </div>
          <div className="flex items-center gap-2.5 rounded-xl border border-[var(--border-light)] bg-[var(--elevated)] px-3.5 py-2.5">
            <Lock size={16} className="flex-shrink-0 text-[var(--text-dim)]" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required minLength={6} className="w-full bg-transparent text-sm outline-none placeholder-[var(--text-dim)]" />
          </div>
          {error && <p className={`text-sm ${error.includes("Check your email") ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50">{loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}</button>
        </form>
        <p className="text-center text-sm text-[var(--text-muted)]">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="font-medium text-[var(--accent)] hover:underline">{isSignUp ? "Sign in" : "Sign up"}</button>
        </p>
      </div>
    </div>
  );
}
