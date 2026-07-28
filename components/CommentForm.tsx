"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CommentForm({
  postId,
  parentId = null,
  isGuest,
  onDone,
}: {
  postId: number;
  parentId?: number | null;
  isGuest: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/comments", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        postId,
        parentId,
        body,
        guest_name: isGuest ? name : undefined,
        guest_pin: isGuest ? pin : undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(json.error ?? "Failed.");
    setBody("");
    setName("");
    setPin("");
    onDone?.();
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      {isGuest && (
        <div className="flex flex-wrap gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            minLength={2}
            maxLength={12}
            required
            className="border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
            style={{ borderRadius: 2, width: 140 }}
          />
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="PIN (4 digits)"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            required
            className="border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
            style={{ borderRadius: 2, width: 120 }}
          />
        </div>
      )}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentId ? "Write a reply…" : "Write a comment…"}
        required
        rows={parentId ? 2 : 3}
        className="resize-y border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
        style={{ borderRadius: 2 }}
      />
      {error && <div className="text-accent">{error}</div>}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="btn btn-accent">
          {busy ? "Posting…" : parentId ? "Reply" : "Comment"}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="btn">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
