import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { authorSnapshot } from "@/lib/snapshot";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request";

const MAX_IMAGES = 6;
const MAX_BYTES = 20 * 1024 * 1024;
const PIN_RE = /^\d{4}$/;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const rl = rateLimit(`post:${ip}`, 1, 30_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Slow down — wait ${Math.ceil(rl.retryAfterMs / 1000)}s before posting again.` },
      { status: 429 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data." }, { status: 400 });
  }

  const title = String(form.get("title") ?? "").trim();
  const body = String(form.get("body") ?? "").trim();
  if (!title || title.length > 300)
    return NextResponse.json({ error: "Title is required (max 300 chars)." }, { status: 400 });
  if (!body) return NextResponse.json({ error: "Body is required." }, { status: 400 });

  // Identify author.
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
      return NextResponse.json(
        { error: "Finish setting up your profile first." },
        { status: 400 },
      );
    author_id = profile.id;
    snap = authorSnapshot(profile);
  } else {
    guest_name = String(form.get("guest_name") ?? "").trim();
    const pin = String(form.get("guest_pin") ?? "");
    if (guest_name.length < 2 || guest_name.length > 12)
      return NextResponse.json({ error: "Name must be 2–12 characters." }, { status: 400 });
    if (!PIN_RE.test(pin))
      return NextResponse.json({ error: "PIN must be exactly 4 digits." }, { status: 400 });
    guest_password_hash = await bcrypt.hash(pin, 10);
  }

  // Upload images to the public post-images bucket (server-side, service role).
  const files = form.getAll("images").filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_IMAGES)
    return NextResponse.json({ error: `Max ${MAX_IMAGES} images.` }, { status: 400 });

  const image_paths: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/"))
      return NextResponse.json({ error: "Only image files are allowed." }, { status: 400 });
    if (file.size > MAX_BYTES)
      return NextResponse.json({ error: "Each image must be under 20MB." }, { status: 400 });
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `posts/${randomUUID()}.${ext}`;
    const { error: upErr } = await admin.storage
      .from("post-images")
      .upload(path, await file.arrayBuffer(), { contentType: file.type });
    if (upErr)
      return NextResponse.json({ error: "Image upload failed." }, { status: 500 });
    image_paths.push(path);
  }

  const { data, error } = await admin
    .from("posts")
    .insert({
      title,
      body,
      author_id,
      guest_name,
      guest_password_hash,
      image_paths,
      author_tier: snap.author_tier,
      author_total_lb: snap.author_total_lb,
    })
    .select("id")
    .single();

  if (error)
    return NextResponse.json({ error: "Could not create post." }, { status: 500 });

  return NextResponse.json({ id: data.id });
}
