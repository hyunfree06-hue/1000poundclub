import "server-only";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isUnit, type Unit } from "@/lib/units";

export const UNIT_COOKIE = "unit";

// The viewer's display unit preference (header toggle), stored in a cookie.
export async function getUnit(): Promise<Unit> {
  const store = await cookies();
  const v = store.get(UNIT_COOKIE)?.value;
  return isUnit(v) ? v : "lb";
}

export interface ViewerProfile {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  unit: Unit;
  squat_lb: number | null;
  bench_lb: number | null;
  deadlift_lb: number | null;
  total_lb: number | null;
  is_verified: boolean;
  verified_at: string | null;
  created_at: string;
}

const PROFILE_COLUMNS =
  "id, username, avatar_url, bio, unit, squat_lb, bench_lb, deadlift_lb, total_lb, is_verified, verified_at, created_at";

export interface Viewer {
  userId: string | null;
  profile: ViewerProfile | null;
  unit: Unit;
}

// Current signed-in user + their profile row (if any). Never selects
// guest_password_hash (that column isn't on profiles anyway).
export async function getViewer(): Promise<Viewer> {
  const unit = await getUnit();
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { userId: null, profile: null, unit };

    const { data: profile } = await supabase
      .from("profiles")
      .select(PROFILE_COLUMNS)
      .eq("id", user.id)
      .maybeSingle();

    return {
      userId: user.id,
      profile: (profile as ViewerProfile | null) ?? null,
      unit,
    };
  } catch {
    // Missing/placeholder Supabase env, or network issue: treat as logged out.
    return { userId: null, profile: null, unit };
  }
}
