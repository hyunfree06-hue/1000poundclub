"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

// The only auth entry point. Framed as verification — never "log in / sign up".
export default function GoogleSignIn({ next = "/verify/submit" }: { next?: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={signIn} disabled={busy} className="btn btn-accent">
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      {error && <p className="mt-2 text-accent">{error}</p>}
    </div>
  );
}
