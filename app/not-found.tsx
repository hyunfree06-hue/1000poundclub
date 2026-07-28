import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="text-[40px] font-bold text-ink">404</div>
      <p className="mt-2 text-muted">
        This page doesn&apos;t exist — or the post was deleted.
      </p>
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/" className="btn btn-accent">
          Back to the board
        </Link>
        <Link href="/leaderboard" className="btn">
          Leaderboard
        </Link>
      </div>
    </div>
  );
}
