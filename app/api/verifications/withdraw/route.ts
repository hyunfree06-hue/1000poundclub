import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Withdraw the current pending verification so the user can start over.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const admin = createAdminClient();

  // Remove proof files for the pending request, then the row.
  const { data: pending } = await admin
    .from("verifications")
    .select("id, squat_proof_path, bench_proof_path, deadlift_proof_path")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pending) {
    await admin.storage
      .from("proofs")
      .remove([
        pending.squat_proof_path,
        pending.bench_proof_path,
        pending.deadlift_proof_path,
      ]);
    await admin.from("verifications").delete().eq("id", pending.id);
  }

  return NextResponse.json({ ok: true });
}
