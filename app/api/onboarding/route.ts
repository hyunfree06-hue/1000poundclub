import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isUnit } from "@/lib/units";

const USERNAME_RE = /^[a-z0-9_]{3,16}$/;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const username = String(json.username ?? "").trim().toLowerCase();
  const unit = json.unit;

  if (!USERNAME_RE.test(username))
    return NextResponse.json(
      { error: "Username must be 3–16 chars: a–z, 0–9, underscore." },
      { status: 400 },
    );
  if (!isUnit(unit))
    return NextResponse.json({ error: "Pick a unit." }, { status: 400 });

  const admin = createAdminClient();

  // Already onboarded?
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ ok: true });

  const { error } = await admin.from("profiles").insert({
    id: user.id,
    username,
    unit,
    avatar_url: user.user_metadata?.avatar_url ?? null,
  });

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    return NextResponse.json({ error: "Could not create profile." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
