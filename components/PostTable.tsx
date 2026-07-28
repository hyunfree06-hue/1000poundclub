import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import { shortDate } from "@/lib/format";
import type { Unit } from "@/lib/units";
import type { PostRow } from "@/lib/board";

function AuthorCell({ row, unit }: { row: PostRow; unit: Unit }) {
  if (row.author) {
    return (
      <span className="inline-flex items-center gap-1">
        <TierBadge
          totalLb={row.author_total_lb}
          tierName={row.author_tier}
          unit={unit}
        />
        <Link href={`/u/${row.author.username}`}>{row.author.username}</Link>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1">
      <TierBadge guest />
      <span>{row.guest_name}</span>
    </span>
  );
}

export default function PostTable({
  rows,
  unit,
}: {
  rows: PostRow[];
  unit: Unit;
}) {
  return (
    <table className="board">
      <thead>
        <tr>
          <th className="w-12">#</th>
          <th>Title</th>
          <th className="hidden w-44 sm:table-cell">Author</th>
          <th className="hidden w-16 sm:table-cell">Date</th>
          <th className="hidden w-14 sm:table-cell">Views</th>
          <th className="w-14">Votes</th>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 && (
          <tr>
            <td colSpan={6} className="py-6 text-center text-muted">
              No posts yet. Be the first to write.
            </td>
          </tr>
        )}
        {rows.map((row) => {
          const hasImg = (row.image_paths?.length ?? 0) > 0;
          return (
            <tr key={row.id}>
              <td className="text-muted">{row.id}</td>
              <td>
                <Link href={`/post/${row.id}`} className="text-ink hover:text-accent">
                  {row.title}
                </Link>
                {row.comment_count > 0 && (
                  <span className="ml-1 font-bold text-accent">
                    [{row.comment_count}]
                  </span>
                )}
                {hasImg && <span className="ml-1 text-xs text-muted">[img]</span>}
                {/* mobile-only meta line */}
                <div className="mt-[1px] flex items-center gap-2 text-xs text-muted sm:hidden">
                  <AuthorCell row={row} unit={unit} />
                  <span>·</span>
                  <span>{shortDate(row.created_at)}</span>
                  <span>·</span>
                  <span>{row.views} views</span>
                </div>
              </td>
              <td className="hidden sm:table-cell">
                <AuthorCell row={row} unit={unit} />
              </td>
              <td className="hidden text-muted sm:table-cell">
                {shortDate(row.created_at)}
              </td>
              <td className="hidden text-muted sm:table-cell">{row.views}</td>
              <td className={row.votes > 0 ? "font-bold text-accent" : "text-muted"}>
                {row.votes}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
