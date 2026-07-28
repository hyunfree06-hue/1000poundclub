"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Unit } from "@/lib/units";

type Lift = "squat" | "bench" | "deadlift";
const LIFTS: Lift[] = ["squat", "bench", "deadlift"];
const LABELS: Record<Lift, string> = {
  squat: "Squat",
  bench: "Bench",
  deadlift: "Deadlift",
};

export default function VerifySubmitForm({ defaultUnit }: { defaultUnit: Unit }) {
  const router = useRouter();
  const [unit, setUnit] = useState<Unit>(defaultUnit);
  const [files, setFiles] = useState<Record<Lift, File | null>>({
    squat: null,
    bench: null,
    deadlift: null,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function isImage(f: File) {
    return f.type.startsWith("image/");
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    for (const l of LIFTS) {
      if (!files[l]) {
        setError(`Upload proof for ${LABELS[l]}.`);
        return;
      }
    }
    setBusy(true);
    const form = new FormData(e.currentTarget);
    form.set("unit", unit);
    LIFTS.forEach((l) => form.set(`${l}_proof`, files[l] as File));

    const res = await fetch("/api/verifications", { method: "POST", body: form });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Failed.");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-muted">Unit</span>
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

      <div className="grid gap-4 sm:grid-cols-3">
        {LIFTS.map((l) => (
          <div key={l} className="flex flex-col gap-2 border border-hairline p-3">
            <label className="flex flex-col gap-1">
              <span className="font-bold text-ink">
                {LABELS[l]} ({unit})
              </span>
              <input
                name={l}
                type="number"
                min="1"
                step="any"
                required
                className="border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
                style={{ borderRadius: 2 }}
              />
            </label>

            <label className="cursor-pointer text-xs text-muted">
              Proof (image or video, ≤20MB)
              <input
                type="file"
                accept="image/*,video/*"
                required
                className="mt-1 block w-full text-xs"
                onChange={(e) =>
                  setFiles((prev) => ({ ...prev, [l]: e.target.files?.[0] ?? null }))
                }
              />
            </label>

            {files[l] &&
              (isImage(files[l] as File) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={URL.createObjectURL(files[l] as File)}
                  alt=""
                  className="h-24 w-full border border-hairline object-cover"
                  style={{ borderRadius: 2 }}
                />
              ) : (
                <video
                  src={URL.createObjectURL(files[l] as File)}
                  className="h-24 w-full border border-hairline object-cover"
                  style={{ borderRadius: 2 }}
                  muted
                />
              ))}
          </div>
        ))}
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-muted">Note to the admin (optional)</span>
        <textarea
          name="note"
          rows={3}
          className="border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
          style={{ borderRadius: 2 }}
        />
      </label>

      {error && <div className="border border-accent bg-[#fdecea] px-2 py-1 text-accent">{error}</div>}

      <button type="submit" disabled={busy} className="btn btn-accent self-start">
        {busy ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
