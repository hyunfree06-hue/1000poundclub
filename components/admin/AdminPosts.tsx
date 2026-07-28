"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { hardDeletePost, hardDeleteComment } from "@/app/admin/actions";
import { shortDate } from "@/lib/format";

export interface AdminPostRow {
  id: number;
  title: string;
  author: string;
  is_deleted: boolean;
  created_at: string;
}
export interface AdminCommentRow {
  id: number;
  post_id: number;
  body: string;
  author: string;
  is_deleted: boolean;
  created_at: string;
}

function DeleteBtn({ onDelete }: { onDelete: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        if (!confirm("Hard-delete this permanently?")) return;
        setBusy(true);
        await onDelete();
        setBusy(false);
      }}
      className="btn text-accent"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}

export default function AdminPosts({
  posts,
  comments,
}: {
  posts: AdminPostRow[];
  comments: AdminCommentRow[];
}) {
  const router = useRouter();
  const refresh = () => router.refresh();

  return (
    <div className="flex flex-col gap-6">
      <section>
        <h2 className="mb-2 text-base font-bold">Recent posts</h2>
        <table className="board">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Title</th>
              <th className="w-32">Author</th>
              <th className="w-16">Date</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className={p.is_deleted ? "text-muted line-through" : ""}>
                <td className="text-muted">{p.id}</td>
                <td>
                  <Link href={`/post/${p.id}`} className="text-ink hover:text-accent">
                    {p.title}
                  </Link>
                </td>
                <td>{p.author}</td>
                <td className="text-muted">{shortDate(p.created_at)}</td>
                <td>
                  <DeleteBtn
                    onDelete={async () => {
                      await hardDeletePost(p.id);
                      refresh();
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="mb-2 text-base font-bold">Recent comments</h2>
        <table className="board">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Comment</th>
              <th className="w-32">Author</th>
              <th className="w-16">Date</th>
              <th className="w-20"></th>
            </tr>
          </thead>
          <tbody>
            {comments.map((c) => (
              <tr key={c.id} className={c.is_deleted ? "text-muted line-through" : ""}>
                <td className="text-muted">{c.id}</td>
                <td>
                  <Link href={`/post/${c.post_id}`} className="text-ink hover:text-accent">
                    {c.body.slice(0, 80)}
                  </Link>
                </td>
                <td>{c.author}</td>
                <td className="text-muted">{shortDate(c.created_at)}</td>
                <td>
                  <DeleteBtn
                    onDelete={async () => {
                      await hardDeleteComment(c.id);
                      refresh();
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
