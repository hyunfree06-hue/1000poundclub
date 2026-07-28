import Link from "next/link";
import { notFound } from "next/navigation";
import TierBadge from "@/components/TierBadge";
import EditProfile from "@/components/EditProfile";
import UnitToggle from "@/components/UnitToggle";
import { createClient } from "@/lib/supabase/server";
import { getViewer } from "@/lib/viewer";
import { getTier } from "@/lib/tiers";
import { toDisplay, formatWeight } from "@/lib/units";
import { fullDate, shortDate } from "@/lib/format";

export const dynamic = "force-dynamic";

interface ProfileFull {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  squat_lb: number | null;
  bench_lb: number | null;
  deadlift_lb: number | null;
  total_lb: number | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { username } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "comments" ? "comments" : "posts";

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, username, avatar_url, bio, squat_lb, bench_lb, deadlift_lb, total_lb, is_verified, verified_at, created_at",
    )
    .eq("username", username.toLowerCase())
    .maybeSingle();

  const profile = data as ProfileFull | null;
  if (!profile) notFound();

  const { userId, unit } = await getViewer();
  const isOwn = userId === profile.id;
  const total = profile.total_lb ?? 0;
  const tier = getTier(total);

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, comment_count, votes, created_at")
    .eq("author_id", profile.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: comments } = await supabase
    .from("comments")
    .select("id, post_id, body, created_at")
    .eq("author_id", profile.id)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div>
      {/* Header block */}
      <div className="flex flex-wrap items-start gap-4 border-b border-hairline pb-4">
        <div
          className="flex h-16 w-16 items-center justify-center border border-hairline bg-[#f6f6f6] text-[22px] font-bold text-muted"
          style={{ borderRadius: 2, overflow: "hidden" }}
        >
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.username.charAt(0).toUpperCase()
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-[18px] font-bold text-ink">{profile.username}</h1>
          </div>
          <div className="mt-1 text-xs text-muted">Joined {fullDate(profile.created_at)}</div>
          {profile.bio && <p className="mt-2 max-w-prose text-ink">{profile.bio}</p>}
        </div>

        {isOwn && (
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Unit</span>
              <UnitToggle unit={unit} />
            </div>
            <div className="flex gap-2">
              <Link href="/verify/submit" className="btn btn-accent">
                Update my total
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Stat block */}
      <div className="border-b border-hairline py-5 text-center">
        {profile.is_verified ? (
          <>
            <div className="text-muted">TOTAL</div>
            <div className="text-[40px] font-bold leading-none text-ink">
              {toDisplay(total, unit)}
              <span className="ml-1 text-base font-normal text-muted">{unit}</span>
            </div>
            <div className="mt-2">
              <TierBadge totalLb={total} unit={unit} />
            </div>
            <div className="mx-auto mt-4 flex max-w-sm justify-between text-base">
              <Stat label="Squat" lb={profile.squat_lb} unit={unit} />
              <Stat label="Bench" lb={profile.bench_lb} unit={unit} />
              <Stat label="Deadlift" lb={profile.deadlift_lb} unit={unit} />
            </div>
            {profile.verified_at && (
              <div className="mt-3 text-xs text-muted">
                Verified on {fullDate(profile.verified_at)}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-muted">Not verified yet.</p>
            {isOwn && (
              <Link href="/verify/submit" className="btn btn-accent mt-3 inline-block">
                Verify your total →
              </Link>
            )}
            {isOwn && (
              <div className="mt-3">
                <EditProfile username={profile.username} bio={profile.bio} />
              </div>
            )}
          </>
        )}
        {isOwn && profile.is_verified && (
          <div className="mt-4 flex justify-center">
            <EditProfile username={profile.username} bio={profile.bio} />
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="my-2 flex gap-3 text-base">
        <Link
          href={`/u/${profile.username}?tab=posts`}
          className={activeTab === "posts" ? "font-bold text-accent" : "text-muted hover:text-ink"}
        >
          Posts ({posts?.length ?? 0})
        </Link>
        <Link
          href={`/u/${profile.username}?tab=comments`}
          className={activeTab === "comments" ? "font-bold text-accent" : "text-muted hover:text-ink"}
        >
          Comments ({comments?.length ?? 0})
        </Link>
      </div>

      {activeTab === "posts" ? (
        <table className="board">
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Title</th>
              <th className="w-16">Date</th>
              <th className="w-14">Votes</th>
            </tr>
          </thead>
          <tbody>
            {(posts ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="py-6 text-center text-muted">
                  No posts.
                </td>
              </tr>
            )}
            {(posts ?? []).map((p) => (
              <tr key={p.id}>
                <td className="text-muted">{p.id}</td>
                <td>
                  <Link href={`/post/${p.id}`} className="text-ink hover:text-accent">
                    {p.title}
                  </Link>
                  {p.comment_count > 0 && (
                    <span className="ml-1 font-bold text-accent">[{p.comment_count}]</span>
                  )}
                </td>
                <td className="text-muted">{shortDate(p.created_at)}</td>
                <td className={p.votes > 0 ? "font-bold text-accent" : "text-muted"}>{p.votes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <table className="board">
          <thead>
            <tr>
              <th>Comment</th>
              <th className="w-16">Date</th>
            </tr>
          </thead>
          <tbody>
            {(comments ?? []).length === 0 && (
              <tr>
                <td colSpan={2} className="py-6 text-center text-muted">
                  No comments.
                </td>
              </tr>
            )}
            {(comments ?? []).map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/post/${c.post_id}`} className="text-ink hover:text-accent">
                    {c.body.slice(0, 100)}
                  </Link>
                </td>
                <td className="text-muted">{shortDate(c.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Stat({ label, lb, unit }: { label: string; lb: number | null; unit: "lb" | "kg" }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-muted">{label}</span>
      <span className="font-bold text-ink">{lb != null ? formatWeight(lb, unit) : "—"}</span>
    </div>
  );
}
