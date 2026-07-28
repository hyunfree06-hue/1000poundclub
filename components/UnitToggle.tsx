"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import type { Unit } from "@/lib/units";

// lb/kg toggle in the header. Stores preference in a long-lived cookie and
// refreshes the server components so every weight/badge re-renders.
export default function UnitToggle({ unit }: { unit: Unit }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function set(next: Unit) {
    if (next === unit) return;
    document.cookie = `unit=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <span className="inline-flex select-none border border-hairline" style={{ borderRadius: 2 }}>
      {(["lb", "kg"] as const).map((u) => (
        <button
          key={u}
          type="button"
          onClick={() => set(u)}
          disabled={pending}
          className={`px-2 py-[2px] text-xs ${
            u === unit ? "bg-ink text-white" : "bg-white text-muted hover:text-ink"
          }`}
        >
          {u}
        </button>
      ))}
    </span>
  );
}
