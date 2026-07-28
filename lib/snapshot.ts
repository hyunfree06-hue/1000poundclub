import { getTier } from "@/lib/tiers";

// Snapshot of an author's stats at post/comment time so old content keeps its
// original badge. Unverified/unranked authors snapshot to null (rendered as
// UNRANKED).
export function authorSnapshot(profile: {
  is_verified: boolean;
  total_lb: number | null;
}): { author_tier: string | null; author_total_lb: number | null } {
  if (profile.is_verified && (profile.total_lb ?? 0) > 0) {
    const total = profile.total_lb as number;
    return { author_tier: getTier(total).name, author_total_lb: total };
  }
  return { author_tier: null, author_total_lb: null };
}
