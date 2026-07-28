import Link from "next/link";

// Numbered pages: 1 2 3 4 5 ... Next  (no infinite scroll)
export default function Pagination({
  page,
  total,
  pageSize,
  makeHref,
}: {
  page: number;
  total: number;
  pageSize: number;
  makeHref: (page: number) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const window = 5;
  let start = Math.max(1, page - Math.floor(window / 2));
  const end = Math.min(pages, start + window - 1);
  start = Math.max(1, end - window + 1);

  const nums: number[] = [];
  for (let i = start; i <= end; i++) nums.push(i);

  return (
    <nav className="mt-3 flex items-center justify-center gap-1 text-base">
      {page > 1 && (
        <Link href={makeHref(page - 1)} className="btn">
          Prev
        </Link>
      )}
      {start > 1 && (
        <>
          <Link href={makeHref(1)} className="btn">
            1
          </Link>
          <span className="px-1 text-muted">…</span>
        </>
      )}
      {nums.map((n) => (
        <Link
          key={n}
          href={makeHref(n)}
          className={`btn ${n === page ? "border-accent font-bold text-accent" : ""}`}
        >
          {n}
        </Link>
      ))}
      {end < pages && (
        <>
          <span className="px-1 text-muted">…</span>
          <Link href={makeHref(pages)} className="btn">
            {pages}
          </Link>
        </>
      )}
      {page < pages && (
        <Link href={makeHref(page + 1)} className="btn">
          Next
        </Link>
      )}
    </nav>
  );
}
