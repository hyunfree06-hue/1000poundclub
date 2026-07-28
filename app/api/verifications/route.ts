import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUnit } from "@/lib/units";

const MAX_BYTES = 20 * 1024 * 1024;
const LIFTS = ["squat", "bench", "deadlift"] as const;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  // Must be onboarded.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile)
    return NextResponse.json({ error: "Finish your profile first." }, { status: 400 });

  const admin = createAdminClient();

  // Block resubmission while a pending request exists.
  const { data: pending } = await admin
    .from("verifications")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (pending)
    return NextResponse.json(
      { error: "You already have a verification under review." },
      { status: 409 },
    );

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const submitted_unit = String(form.get("unit") ?? "");
  if (!isUnit(submitted_unit))
    return NextResponse.json({ error: "Pick a unit." }, { status: 400 });

  const nums: Record<string, number> = {};
  for (const lift of LIFTS) {
    const v = Number(form.get(lift));
    if (!Number.isFinite(v) || v <= 0)
      return NextResponse.json({ error: `Enter a valid ${lift}.` }, { status: 400 });
    nums[lift] = v;
  }

  const verId = randomUUID();
  const proofPaths: Record<string, string> = {};

  for (const lift of LIFTS) {
    const file = form.get(`${lift}_proof`);
    if (!(file instanceof File) || file.size === 0)
      return NextResponse.json({ error: `Upload proof for ${lift}.` }, { status: 400 });
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/"))
      return NextResponse.json({ error: "Proof must be an image or video." }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Each file must be under 20MB." }, { status: 400 });

    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${user.id}/${verId}/${lift}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("proofs")
      .upload(path, await file.arrayBuffer(), { contentType: file.type });
    if (upErr)
      return NextResponse.json({ error: "Proof upload failed." }, { status: 500 });
    proofPaths[lift] = path;
  }

  const { error } = await admin.from("verifications").insert({
    id: verId,
    user_id: user.id,
    submitted_unit,
    squat: nums.squat,
    bench: nums.bench,
    deadlift: nums.deadlift,
    squat_proof_path: proofPaths.squat,
    bench_proof_path: proofPaths.bench,
    deadlift_proof_path: proofPaths.deadlift,
    note: String(form.get("note") ?? "").trim() || null,
    status: "pending",
  });
  if (error)
    return NextResponse.json({ error: "Could not submit." }, { status: 500 });

  return NextResponse.json({ ok: true });
}
