"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  createAdminToken,
  verifyAdminToken,
} from "@/lib/admin-session";
import { rateLimit } from "@/lib/rate-limit";
import { kgToLb } from "@/lib/units";
import { getTier } from "@/lib/tiers";

// ---- guard -------------------------------------------------------------
async function requireAdmin() {
  const store = await cookies();
  const ok = await verifyAdminToken(store.get(ADMIN_COOKIE)?.value);
  if (!ok) redirect("/admin/login");
}

// ---- login / logout ----------------------------------------------------
export async function loginAction(formData: FormData) {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();

  const rl = rateLimit(`admin-login:${ip}`, 5, 10 * 60 * 1000);
  if (!rl.ok) redirect("/admin/login?error=locked");

  const password = String(formData.get("password") ?? "");
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected || password !== expected) redirect("/admin/login?error=1");

  const token = await createAdminToken();
  const store = await cookies();
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });
  redirect("/admin");
}

export async function logoutAction() {
  const store = await cookies();
  store.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

// ---- verification review ----------------------------------------------
function toLb(value: number, unit: "lb" | "kg"): number {
  return Math.round(unit === "kg" ? kgToLb(value) : value);
}

// Delete the proof files from the private bucket the moment a verification is
// reviewed, then null out the path columns so we keep no dangling reference and
// the admin UI won't try to render a broken signed URL for reviewed rows.
//
// Storage failure is non-fatal: we log and continue. We still null the columns
// (reviewed rows should never point at proofs), accepting a rare orphaned file
// over ever blocking a review on a flaky storage call.
async function purgeProofs(
  admin: ReturnType<typeof createAdminClient>,
  verificationId: string,
  paths: (string | null)[],
) {
  const toRemove = paths.filter((p): p is string => !!p);
  if (toRemove.length) {
    const { error } = await admin.storage.from("proofs").remove(toRemove);
    if (error) {
      console.error(
        `[admin] proof deletion failed for verification ${verificationId}: ${error.message}`,
      );
    }
  }
  await admin
    .from("verifications")
    .update({
      squat_proof_path: null,
      bench_proof_path: null,
      deadlift_proof_path: null,
    })
    .eq("id", verificationId);
}

// Approve, optionally correcting the claimed numbers first. Edited values are
// interpreted in the verification's submitted_unit.
export async function approveVerification(
  id: string,
  edited: { squat: number; bench: number; deadlift: number } | null,
) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: v } = await admin
    .from("verifications")
    .select(
      "id, user_id, submitted_unit, squat, bench, deadlift, status, squat_proof_path, bench_proof_path, deadlift_proof_path",
    )
    .eq("id", id)
    .maybeSingle();
  if (!v) return { error: "Not found." };

  const unit = v.submitted_unit as "lb" | "kg";
  const squat = edited ? edited.squat : (v.squat as number);
  const bench = edited ? edited.bench : (v.bench as number);
  const deadlift = edited ? edited.deadlift : (v.deadlift as number);

  const squat_lb = toLb(squat, unit);
  const bench_lb = toLb(bench, unit);
  const deadlift_lb = toLb(deadlift, unit);
  const now = new Date().toISOString();

  // Record any edits back onto the verification row for the audit trail.
  await admin
    .from("verifications")
    .update({
      squat,
      bench,
      deadlift,
      status: "approved",
      reviewed_at: now,
    })
    .eq("id", id);

  // Set the user's official lifts (service role bypasses the protect trigger).
  await admin
    .from("profiles")
    .update({
      squat_lb,
      bench_lb,
      deadlift_lb,
      is_verified: true,
      verified_at: now,
    })
    .eq("id", v.user_id);

  // Proofs are no longer needed once approved — delete them and clear the refs.
  await purgeProofs(admin, id, [
    v.squat_proof_path as string | null,
    v.bench_proof_path as string | null,
    v.deadlift_proof_path as string | null,
  ]);

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { ok: true, tier: getTier(squat_lb + bench_lb + deadlift_lb).name };
}

export async function rejectVerification(id: string, note: string) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: v } = await admin
    .from("verifications")
    .select("id, squat_proof_path, bench_proof_path, deadlift_proof_path")
    .eq("id", id)
    .maybeSingle();
  if (!v) return { error: "Not found." };

  await admin
    .from("verifications")
    .update({
      status: "rejected",
      admin_note: note.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  // Delete proofs on reject too, then clear the refs.
  await purgeProofs(admin, id, [
    v.squat_proof_path as string | null,
    v.bench_proof_path as string | null,
    v.deadlift_proof_path as string | null,
  ]);

  revalidatePath("/admin");
  return { ok: true };
}

// ---- post / comment moderation (hard delete) ---------------------------
export async function hardDeletePost(id: number) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("posts").delete().eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true };
}

export async function hardDeleteComment(id: number) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("comments").delete().eq("id", id);
  revalidatePath("/admin");
  return { ok: true };
}
