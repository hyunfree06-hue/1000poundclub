"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Unit } from "@/lib/units";

export default function OnboardingForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [unit, setUnit] = useState<Unit>("lb");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username, unit }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? "Failed.");
      setBusy(false);
      return;
    }
    // Persist the unit preference cookie too.
    document.cookie = `unit=${unit}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    router.push("/verify/submit");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-bold text-ink">Username</span>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="3–16 chars, a–z 0–9 _"
          pattern="[a-z0-9_]{3,16}"
          required
          className="border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
          style={{ borderRadius: 2 }}
        />
      </label>

      <div className="flex flex-col gap-1">
        <span className="font-bold text-ink">Preferred unit</span>
        <div className="flex gap-2">
          {(["lb", "kg"] as const).map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`btn ${unit === u ? "btn-accent" : ""}`}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="text-accent">{error}</div>}

      <button type="submit" disabled={busy} className="btn btn-accent self-start">
        {busy ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
