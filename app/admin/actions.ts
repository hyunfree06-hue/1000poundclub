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
    .select("id, user_id, submitted_unit, squat, bench, deadlift, status")
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

  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  return { ok: true, tier: getTier(squat_lb + bench_lb + deadlift_lb).name };
}

export async function rejectVerification(id: string, note: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin
    .from("verifications")
    .update({
      status: "rejected",
      admin_note: note.trim() || null,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);
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
