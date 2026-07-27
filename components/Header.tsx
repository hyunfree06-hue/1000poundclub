import Link from "next/link";

// Basic top bar: plain-text wordmark + search + right-side auth link,
// with a thin nav strip underneath. Auth states (logged out / unverified /
// verified badge) and the working search + unit toggle are wired up in later
// build steps.
export default function Header() {
  return (
    <header className="border-b border-hairline">
      <div className="mx-auto flex max-w-[960px] items-center gap-4 px-3 py-2">
        <Link
          href="/"
          className="text-[17px] font-bold tracking-tight text-ink hover:no-underline"
        >
          1000<span className="text-accent">LB</span>CLUB
        </Link>

        <form action="/" className="flex-1">
          <input
            type="search"
            name="q"
            placeholder="Search title / body / author"
            className="w-full max-w-[320px] border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
            style={{ borderRadius: 2 }}
          />
        </form>

        <Link href="/verify" className="whitespace-nowrap text-base">
          Verify your total &rarr;
        </Link>
      </div>

      <nav className="navstrip border-t border-hairline bg-[#f6f6f6]">
        <div className="mx-auto flex max-w-[960px] items-center gap-4 px-3 py-1 text-base">
          <Link href="/">Board</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          <span className="ml-auto text-muted">Prove your Big 3.</span>
        </div>
      </nav>
    </header>
  );
}
