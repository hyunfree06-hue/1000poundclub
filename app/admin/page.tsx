import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_COOKIE, verifyAdminToken } from "@/lib/admin-session";
import { mediaKind } from "@/lib/storage";
import { logoutAction } from "@/app/admin/actions";
import AdminQueue, { type QueueRow } from "@/components/admin/AdminQueue";
import AdminPosts, { type AdminPostRow, type AdminCommentRow } from "@/components/admin/AdminPosts";

export const dynamic = "force-dynamic";

type Tab = "pending" | "approved" | "rejected" | "posts";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
  { key: "posts", label: "Posts" },
];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  // Defense in depth (middleware also guards this route).
  const store = await cookies();
  if (!(await verifyAdminToken(store.get(ADMIN_COOKIE)?.value))) redirect("/admin/login");

  const sp = await searchParams;
  const tab: Tab =
    sp.tab === "approved" || sp.tab === "rejected" || sp.tab === "posts"
      ? sp.tab
      : "pending";

  const admin = createAdminClient();

  return (
    <div>
      <div className="mb-3 flex items-center justify-between border-b border-hairline pb-2">
        <div className="flex flex-wrap gap-3 text-base">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/admin?tab=${t.key}`}
              className={t.key === tab ? "font-bold text-accent" : "text-muted hover:text-ink"}
            >
              {t.label}
            </Link>
          ))}
        </div>
        <form action={logoutAction}>
          <button type="submit" className="btn">
            Sign out
          </button>
        </form>
      </div>

      {tab === "posts" ? (
        <PostsTab admin={admin} />
      ) : (
        <VerificationsTab admin={admin} status={tab} />
      )}
    </div>
  );
}

async function VerificationsTab({
  admin,
  status,
}: {
  admin: ReturnType<typeof createAdminClient>;
  status: "pending" | "approved" | "rejected";
}) {
  const { data } = await admin
    .from("verifications")
    .select(
      "id, user_id, submitted_unit, squat, bench, deadlift, squat_proof_path, bench_proof_path, deadlift_proof_path, note, admin_note, status, created_at, profile:profiles(username, squat_lb, bench_lb, deadlift_lb, total_lb, is_verified, verified_at)",
    )
    .eq("status", status)
    // Pending oldest-first (work the queue); reviewed newest-first.
    .order("created_at", { ascending: status === "pending" });

  const rows: QueueRow[] = [];
  for (const v of data ?? []) {
    const profile = v.profile as unknown as {
      username: string;
      squat_lb: number | null;
      bench_lb: number | null;
      deadlift_lb: number | null;
      total_lb: number | null;
      is_verified: boolean;
    } | null;

    const paths = [
      { label: "Squat", path: v.squat_proof_path as string | null },
      { label: "Bench", path: v.bench_proof_path as string | null },
      { label: "Deadlift", path: v.deadlift_proof_path as string | null },
    ];
    const present = paths.filter(
      (p): p is { label: string; path: string } => !!p.path,
    );
    // Reviewed rows have their proofs deleted; don't fetch signed URLs for them.
    const proofsDeleted = present.length === 0;

    let proofs: QueueRow["proofs"] = [];
    if (!proofsDeleted) {
      // Signed URLs, 60-minute expiry, generated server-side.
      const signed = await admin.storage
        .from("proofs")
        .createSignedUrls(present.map((p) => p.path), 60 * 60);
      proofs = present.map((p, i) => ({
        label: p.label,
        url: signed.data?.[i]?.signedUrl ?? null,
        kind: mediaKind(p.path),
      }));
    }

    rows.push({
      id: v.id as string,
      username: profile?.username ?? "(deleted)",
      submitted_unit: v.submitted_unit as "lb" | "kg",
      claimed: {
        squat: v.squat as number,
        bench: v.bench as number,
        deadlift: v.deadlift as number,
      },
      current: {
        squat_lb: profile?.squat_lb ?? null,
        bench_lb: profile?.bench_lb ?? null,
        deadlift_lb: profile?.deadlift_lb ?? null,
        total_lb: profile?.total_lb ?? null,
        is_verified: profile?.is_verified ?? false,
      },
      note: (v.note as string | null) ?? null,
      admin_note: (v.admin_note as string | null) ?? null,
      status: v.status as "pending" | "approved" | "rejected",
      created_at: v.created_at as string,
      proofs,
      proofsDeleted,
    });
  }

  return <AdminQueue rows={rows} status={status} />;
}

async function PostsTab({ admin }: { admin: ReturnType<typeof createAdminClient> }) {
  const [{ data: posts }, { data: comments }] = await Promise.all([
    admin
      .from("posts")
      .select("id, title, guest_name, is_deleted, created_at, author:profiles(username)")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("comments")
      .select("id, post_id, body, guest_name, is_deleted, created_at, author:profiles(username)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const postRows: AdminPostRow[] = (posts ?? []).map((p) => ({
    id: p.id as number,
    title: p.title as string,
    author: (p.author as unknown as { username: string } | null)?.username ?? (p.guest_name as string | null) ?? "?",
    is_deleted: p.is_deleted as boolean,
    created_at: p.created_at as string,
  }));

  const commentRows: AdminCommentRow[] = (comments ?? []).map((c) => ({
    id: c.id as number,
    post_id: c.post_id as number,
    body: c.body as string,
    author: (c.author as unknown as { username: string } | null)?.username ?? (c.guest_name as string | null) ?? "?",
    is_deleted: c.is_deleted as boolean,
    created_at: c.created_at as string,
  }));

  return <AdminPosts posts={postRows} comments={commentRows} />;
}
