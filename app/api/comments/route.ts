import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authorSnapshot } from "@/lib/snapshot";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

const PIN_RE = /^\d{4}$/;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`comment:${ip}`, 1, 30_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: `Slow down — wait ${Math.ceil(rl.retryAfterMs / 1000)}s.` },
      { status: 429 },
    );

  const json = await req.json().catch(() => ({}));
  const postId = Number(json.postId);
  const parentId = json.parentId != null ? Number(json.parentId) : null;
  const bodyText = String(json.body ?? "").trim();
  if (!Number.isInteger(postId))
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (!bodyText) return NextResponse.json({ error: "Comment is empty." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const admin = createAdminClient();

  let author_id: string | null = null;
  let guest_name: string | null = null;
  let guest_password_hash: string | null = null;
  let snap = { author_tier: null as string | null, author_total_lb: null as number | null };

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, is_verified, total_lb")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile)
      return NextResponse.json({ error: "Finish your profile first." }, { status: 400 });
    author_id = profile.id;
    snap = authorSnapshot(profile);
  } else {
    guest_name = String(json.guest_name ?? "").trim();
    const pin = String(json.guest_pin ?? "");
    if (guest_name.length < 2 || guest_name.length > 12)
      return NextResponse.json({ error: "Name must be 2–12 characters." }, { status: 400 });
    if (!PIN_RE.test(pin))
      return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
    guest_password_hash = await bcrypt.hash(pin, 10);
  }

  const { error } = await admin.from("comments").insert({
    post_id: postId,
    parent_id: parentId,
    body: bodyText,
    author_id,
    guest_name,
    guest_password_hash,
    author_tier: snap.author_tier,
    author_total_lb: snap.author_total_lb,
  });
  if (error) return NextResponse.json({ error: "Could not comment." }, { status: 500 });

  await admin.rpc("bump_comment_count", { p_id: postId, delta: 1 });
  return NextResponse.json({ ok: true });
}
