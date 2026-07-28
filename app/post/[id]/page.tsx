import Link from "next/link";
import { notFound } from "next/navigation";
import TierBadge from "@/components/TierBadge";
import VoteButton from "@/components/VoteButton";
import AuthorControls from "@/components/AuthorControls";
import CommentForm from "@/components/CommentForm";
import CommentThread, { type CommentNode } from "@/components/CommentThread";
import { Markdown } from "@/lib/markdown";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/viewer";
import { publicUrl } from "@/lib/storage";
import { fullDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PostDetail {
  id: number;
  title: string;
  body: string;
  image_paths: string[] | null;
  views: number;
  votes: number;
  created_at: string;
  author_id: string | null;
  guest_name: string | null;
  author_tier: string | null;
  author_total_lb: number | null;
  is_deleted: boolean;
  author: { username: string; avatar_url: string | null } | null;
}

const POST_COLUMNS =
  "id, title, body, image_paths, views, votes, created_at, author_id, guest_name, author_tier, author_total_lb, is_deleted, author:profiles(username, avatar_url)";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const postId = Number(id);
  if (!Number.isInteger(postId)) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select(POST_COLUMNS)
    .eq("id", postId)
    .eq("is_deleted", false)
    .maybeSingle();

  const post = data as unknown as PostDetail | null;
  if (!post) notFound();

  // Count the view (best-effort, service role).
  try {
    await createAdminClient().rpc("bump_views", { p_id: postId });
  } catch {
    /* ignore */
  }

  const { userId, unit } = await getViewer();
  const isOwner = !!post.author_id && post.author_id === userId;
  const isGuestPost = !post.author_id;
  const viewerIsGuest = !userId;

  const { data: rawComments } = await supabase
    .from("comments")
    .select(
      "id, parent_id, body, created_at, author_id, guest_name, author_tier, author_total_lb, author:profiles(username)",
    )
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  const comments: CommentNode[] = (rawComments ?? []).map((c) => {
    const author = c.author as unknown as { username: string } | null;
    return {
      id: c.id as number,
      parent_id: (c.parent_id as number | null) ?? null,
      body: c.body as string,
      created_at: c.created_at as string,
      guest_name: (c.guest_name as string | null) ?? null,
      author_tier: (c.author_tier as string | null) ?? null,
      author_total_lb: (c.author_total_lb as number | null) ?? null,
      author_username: author?.username ?? null,
      isOwner: !!c.author_id && c.author_id === userId,
    };
  });

  return (
    <article>
      <div className="mb-1 text-xs text-muted">
        <Link href="/">Board</Link> / #{post.id}
      </div>

      <h1 className="border-b border-hairline pb-2 text-[18px] font-bold text-ink">
        {post.title}
      </h1>

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline py-2 text-xs text-muted">
        <div className="flex flex-wrap items-center gap-2">
          {post.author ? (
            <span className="inline-flex items-center gap-1">
              <TierBadge
                totalLb={post.author_total_lb}
                tierName={post.author_tier}
                unit={unit}
              />
              <Link href={`/u/${post.author.username}`} className="font-bold text-ink">
                {post.author.username}
              </Link>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <TierBadge guest />
              <span className="font-bold text-ink">{post.guest_name}</span>
            </span>
          )}
          <span>·</span>
          <span>{fullDate(post.created_at)}</span>
          <span>·</span>
          <span>{post.views} views</span>
        </div>
        <AuthorControls
          kind="post"
          id={post.id}
          isOwner={isOwner}
          isGuest={isGuestPost}
          title={post.title}
          body={post.body}
        />
      </div>

      <div className="py-4">
        <Markdown source={post.body} />

        {(post.image_paths?.length ?? 0) > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            {post.image_paths!.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={p}
                src={publicUrl("post-images", p)}
                alt=""
                className="max-w-full border border-hairline"
                style={{ borderRadius: 2 }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-center border-y border-hairline py-3">
        <VoteButton postId={post.id} initialVotes={post.votes} />
      </div>

      <section className="mt-4">
        <h2 className="mb-2 text-base font-bold">Comments</h2>
        <CommentThread
          comments={comments}
          unit={unit}
          postId={post.id}
          viewerIsGuest={viewerIsGuest}
        />
        <div className="mt-3 border-t border-hairline pt-3">
          <CommentForm postId={post.id} isGuest={viewerIsGuest} />
        </div>
      </section>
    </article>
  );
}
