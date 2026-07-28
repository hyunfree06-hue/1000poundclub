"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditProfile({
  username,
  bio,
}: {
  username: string;
  bio: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [u, setU] = useState(username);
  const [b, setB] = useState(bio ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ username: u, bio: b }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Failed.");
    setOpen(false);
    if (u !== username) router.push(`/u/${u}`);
    router.refresh();
  }

  if (!open)
    return (
      <button type="button" className="btn" onClick={() => setOpen(true)}>
        Edit profile
      </button>
    );

  return (
    <div className="w-full border border-hairline p-3">
      <label className="flex flex-col gap-1 text-xs text-muted">
        Username
        <input
          value={u}
          onChange={(e) => setU(e.target.value.toLowerCase())}
          className="border border-hairline px-2 py-1 text-base text-ink outline-none focus:border-accent"
          style={{ borderRadius: 2, maxWidth: 220 }}
        />
      </label>
      <label className="mt-2 flex flex-col gap-1 text-xs text-muted">
        Bio
        <textarea
          value={b}
          onChange={(e) => setB(e.target.value)}
          rows={3}
          maxLength={500}
          className="border border-hairline px-2 py-1 text-base text-ink outline-none focus:border-accent"
          style={{ borderRadius: 2 }}
        />
      </label>
      {error && <p className="mt-1 text-accent">{error}</p>}
      <div className="mt-2 flex gap-2">
        <button type="button" disabled={busy} onClick={save} className="btn btn-accent">
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" disabled={busy} onClick={() => setOpen(false)} className="btn">
          Cancel
        </button>
      </div>
    </div>
  );
}
