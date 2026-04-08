"use client";

import { useState, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid } from "lucide-react";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const redirectTo = searchParams.get("next") || "/database";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignUp) {
        if (password.length < 8) {
          setError("Password must be at least 8 characters");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError("Check your email for a confirmation link!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-1.5 text-lg font-bold">
          <LayoutGrid size={20} className="text-[var(--accent)]" />
          Card<span className="text-[var(--accent)]">Board</span>
        </div>
        <h1 className="mt-4 text-xl font-bold">{isSignUp ? "Create an account" : "Sign in"}</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">{isSignUp ? "Get started with CardBoard" : "Welcome back to CardBoard"}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2.5 text-sm outline-none placeholder-[var(--text-dim)] transition-colors focus:border-[var(--accent)]" />
          </div>
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-medium text-[var(--text-secondary)]">Password</label>
              {!isSignUp && <button type="button" className="text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)]">Forgot?</button>}
            </div>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} className="w-full rounded-lg border border-[var(--border-light)] bg-[var(--elevated)] px-3 py-2.5 text-sm outline-none placeholder-[var(--text-dim)] transition-colors focus:border-[var(--accent)]" />
            {isSignUp && (
              <p className="mt-1 text-xs text-[var(--text-dim)]">Minimum 8 characters</p>
            )}
          </div>
          {error && <p className={`text-sm ${error.includes("Check your email") ? "text-[var(--success)]" : "text-[var(--danger)]"}`}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-lg bg-[var(--accent)] py-2.5 text-sm font-semibold text-[var(--background)] transition-colors hover:bg-[var(--accent-hover)] disabled:opacity-50">{loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}</button>
        </form>
        <p className="mt-5 text-sm text-[var(--text-muted)]">
          {isSignUp ? "Already have an account?" : "No account?"}{" "}
          <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="font-medium text-[var(--accent)] hover:underline">{isSignUp ? "Sign in" : "Create one"}</button>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
