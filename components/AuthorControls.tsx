"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Kind = "post" | "comment";

// Edit/Delete controls for a post or comment. Logged-in authors act directly;
// guests must enter their 4-digit PIN (verified server-side with bcrypt).
export default function AuthorControls({
  kind,
  id,
  isOwner,
  isGuest,
  title,
  body,
}: {
  kind: Kind;
  id: number;
  isOwner: boolean;
  isGuest: boolean;
  title?: string;
  body?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<null | "edit" | "delete">(null);
  const [pin, setPin] = useState("");
  const [t, setT] = useState(title ?? "");
  const [b, setB] = useState(body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Only owners or guests-with-PIN can act; members who aren't the owner see nothing.
  if (!isOwner && !isGuest) return null;

  const base = kind === "post" ? "/api/posts" : "/api/comments";

  async function doDelete() {
    setBusy(true);
    setError(null);
    const res = await fetch(`${base}/${id}`, {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ pin: isGuest ? pin : undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Failed.");
    if (kind === "post") router.push("/");
    else router.refresh();
  }

  async function doEdit() {
    setBusy(true);
    setError(null);
    const res = await fetch(`${base}/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title: t, body: b, pin: isGuest ? pin : undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Failed.");
    setMode(null);
    router.refresh();
  }

  return (
    <span className="inline-flex items-center gap-2 text-xs text-muted">
      {kind === "post" && (
        <button type="button" className="hover:text-accent" onClick={() => setMode("edit")}>
          Edit
        </button>
      )}
      <button type="button" className="hover:text-accent" onClick={() => setMode("delete")}>
        Delete
      </button>

      {mode && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          onClick={() => !busy && setMode(null)}
        >
          <div
            className="w-full max-w-md border border-hairline bg-white p-4"
            style={{ borderRadius: 2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-bold text-ink">
              {mode === "edit" ? "Edit post" : `Delete this ${kind}?`}
            </h3>

            {mode === "edit" && (
              <div className="flex flex-col gap-2">
                <input
                  value={t}
                  onChange={(e) => setT(e.target.value)}
                  className="border border-hairline px-2 py-1 text-base text-ink outline-none focus:border-accent"
                  style={{ borderRadius: 2 }}
                />
                <textarea
                  value={b}
                  onChange={(e) => setB(e.target.value)}
                  rows={10}
                  className="border border-hairline px-2 py-1 text-base text-ink outline-none focus:border-accent"
                  style={{ borderRadius: 2 }}
                />
              </div>
            )}

            {isGuest && (
              <label className="mt-2 flex flex-col gap-1 text-xs text-muted">
                Enter your 4-digit PIN
                <input
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  inputMode="numeric"
                  maxLength={4}
                  className="border border-hairline px-2 py-1 text-base text-ink outline-none focus:border-accent"
                  style={{ borderRadius: 2, width: 90 }}
                />
              </label>
            )}

            {error && <div className="mt-2 text-accent">{error}</div>}

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={mode === "edit" ? doEdit : doDelete}
                className="btn btn-accent"
              >
                {busy ? "Working…" : mode === "edit" ? "Save" : "Delete"}
              </button>
              <button type="button" disabled={busy} onClick={() => setMode(null)} className="btn">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </span>
  );
}
