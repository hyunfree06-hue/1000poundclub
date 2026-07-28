import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import { createClient } from "@/lib/supabase/server";
import { getUnit } from "@/lib/viewer";
import { TIERS } from "@/lib/tiers";
import { toDisplay } from "@/lib/units";

export const dynamic = "force-dynamic";

interface LbRow {
  username: string;
  squat_lb: number | null;
  bench_lb: number | null;
  deadlift_lb: number | null;
  total_lb: number | null;
}

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier: tierParam } = await searchParams;
  const unit = await getUnit();
  const supabase = await createClient();

  const activeTier = TIERS.find((t) => t.name === tierParam) ?? null;

  let query = supabase
    .from("profiles")
    .select("username, squat_lb, bench_lb, deadlift_lb, total_lb")
    .eq("is_verified", true)
    .order("total_lb", { ascending: false })
    .limit(100);

  if (activeTier) {
    // Upper bound = smallest min strictly greater than this tier's min.
    const highers = TIERS.filter((t) => t.min > activeTier.min).map((t) => t.min);
    const upper = highers.length ? Math.min(...highers) : null;
    query = query.gte("total_lb", activeTier.min);
    if (upper != null) query = query.lt("total_lb", upper);
  }

  const { data } = await query;
  const rows = (data ?? []) as LbRow[];

  return (
    <div>
      <h1 className="mb-1 text-[18px] font-bold text-ink">Leaderboard</h1>
      <p className="mb-3 text-muted">Top 100 verified totals.</p>

      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Link
          href="/leaderboard"
          className={`btn ${!activeTier ? "border-accent text-accent" : ""}`}
        >
          All
        </Link>
        {TIERS.map((t) => (
          <Link
            key={t.name}
            href={`/leaderboard?tier=${encodeURIComponent(t.name)}`}
            className={`btn ${activeTier?.name === t.name ? "border-accent text-accent" : ""}`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      <table className="board">
        <thead>
          <tr>
            <th className="w-12">Rank</th>
            <th className="w-40">Tier</th>
            <th>Username</th>
            <th className="hidden w-16 sm:table-cell">Squat</th>
            <th className="hidden w-16 sm:table-cell">Bench</th>
            <th className="hidden w-16 sm:table-cell">Deadlift</th>
            <th className="w-20">Total</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="py-8 text-center text-muted">
                No verified lifters{activeTier ? ` in ${activeTier.name}` : ""} yet.
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={r.username}>
              <td className="text-muted">{i + 1}</td>
              <td>
                <TierBadge totalLb={r.total_lb ?? 0} unit={unit} />
              </td>
              <td>
                <Link href={`/u/${r.username}`} className="font-bold text-ink hover:text-accent">
                  {r.username}
                </Link>
              </td>
              <td className="hidden text-muted sm:table-cell">
                {r.squat_lb != null ? toDisplay(r.squat_lb, unit) : "—"}
              </td>
              <td className="hidden text-muted sm:table-cell">
                {r.bench_lb != null ? toDisplay(r.bench_lb, unit) : "—"}
              </td>
              <td className="hidden text-muted sm:table-cell">
                {r.deadlift_lb != null ? toDisplay(r.deadlift_lb, unit) : "—"}
              </td>
              <td className="font-bold text-ink">
                {toDisplay(r.total_lb ?? 0, unit)} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
