"use client";

import { useState } from "react";
import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import AuthorControls from "@/components/AuthorControls";
import CommentForm from "@/components/CommentForm";
import { renderMarkdown } from "@/lib/markdown";
import { shortDate } from "@/lib/format";
import type { Unit } from "@/lib/units";

export interface CommentNode {
  id: number;
  parent_id: number | null;
  body: string;
  created_at: string;
  guest_name: string | null;
  author_tier: string | null;
  author_total_lb: number | null;
  author_username: string | null;
  isOwner: boolean;
}

function AuthorLine({ c, unit }: { c: CommentNode; unit: Unit }) {
  if (c.author_username) {
    return (
      <span className="inline-flex items-center gap-1">
        <TierBadge totalLb={c.author_total_lb} tierName={c.author_tier} unit={unit} />
        <Link href={`/u/${c.author_username}`} className="font-bold text-ink hover:text-accent">
          {c.author_username}
        </Link>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <TierBadge guest />
      <span className="font-bold text-ink">{c.guest_name}</span>
    </span>
  );
}

function CommentItem({
  c,
  unit,
  postId,
  viewerIsGuest,
  isReply,
}: {
  c: CommentNode;
  unit: Unit;
  postId: number;
  viewerIsGuest: boolean;
  isReply: boolean;
}) {
  const [replying, setReplying] = useState(false);
  return (
    <div className={`border-b border-hairline py-2 ${isReply ? "ml-6 border-l pl-3" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <AuthorLine c={c} unit={unit} />
          <span className="text-xs text-muted">{shortDate(c.created_at)}</span>
        </div>
        <div className="flex items-center gap-2">
          {!isReply && (
            <button
              type="button"
              className="text-xs text-muted hover:text-accent"
              onClick={() => setReplying((v) => !v)}
            >
              Reply
            </button>
          )}
          <AuthorControls
            kind="comment"
            id={c.id}
            isOwner={c.isOwner}
            isGuest={!c.author_username}
          />
        </div>
      </div>
      <div
        className="md-body mt-1"
        dangerouslySetInnerHTML={{ __html: renderMarkdown(c.body) }}
      />
      {replying && (
        <div className="mt-2">
          <CommentForm
            postId={postId}
            parentId={c.id}
            isGuest={viewerIsGuest}
            onDone={() => setReplying(false)}
          />
        </div>
      )}
    </div>
  );
}

export default function CommentThread({
  comments,
  unit,
  postId,
  viewerIsGuest,
}: {
  comments: CommentNode[];
  unit: Unit;
  postId: number;
  viewerIsGuest: boolean;
}) {
  const tops = comments.filter((c) => c.parent_id == null);
  const repliesOf = (id: number) => comments.filter((c) => c.parent_id === id);

  if (comments.length === 0)
    return <p className="py-3 text-muted">No comments yet.</p>;

  return (
    <div>
      {tops.map((c) => (
        <div key={c.id}>
          <CommentItem
            c={c}
            unit={unit}
            postId={postId}
            viewerIsGuest={viewerIsGuest}
            isReply={false}
          />
          {repliesOf(c.id).map((r) => (
            <CommentItem
              key={r.id}
              c={r}
              unit={unit}
              postId={postId}
              viewerIsGuest={viewerIsGuest}
              isReply
            />
          ))}
        </div>
      ))}
    </div>
  );
}
