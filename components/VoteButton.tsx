"use client";

import { useState } from "react";

export default function VoteButton({
  postId,
  initialVotes,
}: {
  postId: number;
  initialVotes: number;
}) {
  const [votes, setVotes] = useState(initialVotes);
  const [voted, setVoted] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function vote() {
    if (busy || voted) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/votes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    const json = await res.json();
    if (res.ok) {
      setVotes(json.votes);
      setVoted(true);
    } else {
      setMsg(json.error ?? "Could not vote.");
      if (res.status === 409) setVoted(true);
    }
    setBusy(false);
  }

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={vote}
        disabled={busy || voted}
        className={`btn ${voted ? "border-accent text-accent" : ""}`}
        style={{ minWidth: 60 }}
        title="Upvote"
      >
        ▲ {votes}
      </button>
      {msg && <span className="mt-1 text-xs text-muted">{msg}</span>}
    </div>
  );
}
