import WriteForm from "@/components/WriteForm";
import { getViewer } from "@/lib/viewer";
import TierBadge from "@/components/TierBadge";

export const dynamic = "force-dynamic";

export default async function WritePage() {
  const { profile, unit } = await getViewer();
  const isGuest = !profile;

  return (
    <div>
      <h1 className="mb-3 border-b border-hairline pb-2 text-[15px] font-bold">Write a post</h1>
      {profile && (
        <div className="mb-3 flex items-center gap-1 text-xs text-muted">
          Posting as
          <TierBadge
            totalLb={profile.is_verified ? profile.total_lb : null}
            unit={unit}
          />
          <span className="text-ink">{profile.username}</span>
        </div>
      )}
      <WriteForm isGuest={isGuest} />
    </div>
  );
}
