import Link from "next/link";
import { cookies } from "next/headers";
import AckVerified from "@/components/AckVerified";
import { getViewer } from "@/lib/viewer";
import { latestVerification } from "@/lib/verify";
import { getTier } from "@/lib/tiers";

// Persistent verification status banner, shown site-wide below the header.
export default async function StatusBanner() {
  const { userId, profile } = await getViewer();
  if (!userId || !profile) return null;

  const latest = await latestVerification(userId);

  // Pending: show on every page load while under review.
  if (latest?.status === "pending") {
    return (
      <Bar>
        <strong className="text-ink">Under review.</strong> Your lifts have been
        submitted. An admin is reviewing your proof — this usually takes 24–48
        hours. You&apos;ll get your badge as soon as it&apos;s approved.
      </Bar>
    );
  }

  // Rejected: show admin note + a way to submit again.
  if (latest?.status === "rejected") {
    return (
      <Bar tone="error">
        <strong>Verification rejected.</strong>{" "}
        {latest.admin_note ? `Admin note: ${latest.admin_note} ` : ""}
        <Link href="/verify/submit" className="underline">
          Submit again
        </Link>
      </Bar>
    );
  }

  // Approved: one-time confirmation, keyed on verified_at.
  if (profile.is_verified && profile.verified_at) {
    const store = await cookies();
    const seen = store.get("ack_verified")?.value;
    if (seen !== profile.verified_at) {
      const tier = getTier(profile.total_lb ?? 0);
      return (
        <Bar tone="ok">
          <AckVerified token={profile.verified_at} />
          <strong>Verified.</strong> You&apos;re {tier.name}.
        </Bar>
      );
    }
  }

  return null;
}

function Bar({
  children,
  tone = "info",
}: {
  children: React.ReactNode;
  tone?: "info" | "error" | "ok";
}) {
  const styles: Record<string, string> = {
    info: "border-hairline bg-[#f6f6f6] text-ink",
    error: "border-accent bg-[#fdecea] text-accent",
    ok: "border-[#4a90a4] bg-[#eaf3f6] text-ink",
  };
  return (
    <div className="border-b border-hairline">
      <div className={`mx-auto max-w-[960px] border-x px-3 py-2 text-base ${styles[tone]}`}>
        {children}
      </div>
    </div>
  );
}
