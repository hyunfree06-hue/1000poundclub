import "server-only";
import { createClient } from "@/lib/supabase/server";

export interface VerificationRow {
  id: string;
  status: "pending" | "approved" | "rejected";
  submitted_unit: "lb" | "kg";
  squat: number;
  bench: number;
  deadlift: number;
  note: string | null;
  admin_note: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const COLUMNS =
  "id, status, submitted_unit, squat, bench, deadlift, note, admin_note, created_at, reviewed_at";

// The user's most recent verification request (RLS restricts to own rows).
export async function latestVerification(
  userId: string,
): Promise<VerificationRow | null> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("verifications")
      .select(COLUMNS)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as VerificationRow | null) ?? null;
  } catch {
    return null;
  }
}
