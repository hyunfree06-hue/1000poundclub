import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isUnit } from "@/lib/units";

const USERNAME_RE = /^[a-z0-9_]{3,16}$/;

// Self-service profile edit. Uses the user's own session (RLS "profiles self
// update"); the DB trigger blocks any attempt to touch lift/verification
// columns, so only username / bio / unit / avatar can change here.
export async function PATCH(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const json = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};

  if (json.username !== undefined) {
    const username = String(json.username).trim().toLowerCase();
    if (!USERNAME_RE.test(username))
      return NextResponse.json(
        { error: "Username must be 3–16 chars: a–z, 0–9, underscore." },
        { status: 400 },
      );
    patch.username = username;
  }
  if (json.bio !== undefined) {
    const bio = String(json.bio);
    if (bio.length > 500)
      return NextResponse.json({ error: "Bio is too long (max 500)." }, { status: 400 });
    patch.bio = bio.trim() || null;
  }
  if (json.unit !== undefined) {
    if (!isUnit(json.unit))
      return NextResponse.json({ error: "Invalid unit." }, { status: 400 });
    patch.unit = json.unit;
  }

  if (Object.keys(patch).length === 0)
    return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "That username is taken." }, { status: 409 });
    return NextResponse.json({ error: "Update failed." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
