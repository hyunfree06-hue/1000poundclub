import Link from "next/link";
import PostTable from "@/components/PostTable";
import Pagination from "@/components/Pagination";
import { listPosts, PAGE_SIZE, type Sort } from "@/lib/board";
import { getUnit } from "@/lib/viewer";

export const dynamic = "force-dynamic";

const SORTS: { key: Sort; label: string }[] = [
  { key: "latest", label: "Latest" },
  { key: "top24h", label: "Top (24h)" },
  { key: "topweek", label: "Top (week)" },
];

function parseSort(v: string | undefined): Sort {
  return v === "top24h" || v === "topweek" ? v : "latest";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; page?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const sort = parseSort(sp.sort);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const q = sp.q?.trim() || undefined;
  const unit = await getUnit();

  let rows: Awaited<ReturnType<typeof listPosts>>["rows"] = [];
  let total = 0;
  let loadError = false;
  try {
    const res = await listPosts({ sort, page, q });
    rows = res.rows;
    total = res.total;
  } catch {
    loadError = true;
  }

  const qs = (over: Record<string, string | number | undefined>) => {
    const p = new URLSearchParams();
    if (sort !== "latest") p.set("sort", sort);
    if (q) p.set("q", q);
    for (const [k, v] of Object.entries(over)) {
      if (v === undefined || v === "" || (k === "sort" && v === "latest")) p.delete(k);
      else p.set(k, String(v));
    }
    const s = p.toString();
    return s ? `/?${s}` : "/";
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-3 text-base">
          {SORTS.map((s) => (
            <Link
              key={s.key}
              href={qs({ sort: s.key, page: undefined })}
              className={
                s.key === sort ? "font-bold text-accent" : "text-muted hover:text-ink"
              }
            >
              {s.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <form action="/" className="flex items-center gap-1">
            {sort !== "latest" && <input type="hidden" name="sort" value={sort} />}
            <input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search title / body / author"
              className="border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
              style={{ borderRadius: 2, width: 200 }}
            />
            <button type="submit" className="btn">
              Search
            </button>
          </form>
          <Link href="/write" className="btn btn-accent">
            Write
          </Link>
        </div>
      </div>

      {q && (
        <div className="mb-2 text-xs text-muted">
          Results for <span className="text-ink">“{q}”</span> — {total} post
          {total === 1 ? "" : "s"}.{" "}
          <Link href={qs({ q: undefined, page: undefined })}>Clear</Link>
        </div>
      )}

      {loadError ? (
        <div className="border border-hairline p-6 text-center text-muted">
          Could not load posts. Check the Supabase connection and that the schema
          has been applied.
        </div>
      ) : (
        <>
          <PostTable rows={rows} unit={unit} />
          <Pagination
            page={page}
            total={total}
            pageSize={PAGE_SIZE}
            makeHref={(p) => qs({ page: p === 1 ? undefined : p })}
          />
        </>
      )}
    </div>
  );
}
