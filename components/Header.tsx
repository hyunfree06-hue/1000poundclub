import Link from "next/link";
import TierBadge from "@/components/TierBadge";
import UnitToggle from "@/components/UnitToggle";
import { getViewer } from "@/lib/viewer";

// Top bar: plain-text wordmark + search + right-side auth link, thin nav strip
// underneath. Auth states:
//   logged out / logged-in unverified -> "Verify your total →"
//   logged-in verified                -> tier badge + username -> profile
export default async function Header() {
  const { profile, unit } = await getViewer();
  const verified = !!profile?.is_verified;

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

        <UnitToggle unit={unit} />

        {verified && profile ? (
          <Link
            href={`/u/${profile.username}`}
            className="inline-flex items-center gap-1 whitespace-nowrap hover:no-underline"
          >
            <TierBadge totalLb={profile.total_lb} unit={unit} />
            <span className="text-ink">{profile.username}</span>
          </Link>
        ) : (
          <Link href="/verify" className="whitespace-nowrap text-base">
            Verify your total &rarr;
          </Link>
        )}
      </div>

      <nav className="navstrip border-t border-hairline bg-[#f6f6f6]">
        <div className="mx-auto flex max-w-[960px] items-center gap-4 px-3 py-1 text-base">
          <Link href="/">Board</Link>
          <Link href="/leaderboard">Leaderboard</Link>
          {profile && !verified && (
            <Link href="/verify/submit" className="text-accent">
              Submit your lifts →
            </Link>
          )}
          <span className="ml-auto text-muted">Prove your Big 3.</span>
        </div>
      </nav>
    </header>
  );
}
