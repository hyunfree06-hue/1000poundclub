import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Verify the caller may mutate this post. Logged-in authors skip the PIN;
// guest posts require the 4-digit PIN, compared server-side with bcrypt.
async function authorize(postId: number, pin: string | undefined) {
  const admin = createAdminClient();
  const { data: post } = await admin
    .from("posts")
    .select("id, author_id, guest_password_hash, is_deleted")
    .eq("id", postId)
    .maybeSingle();

  if (!post || post.is_deleted) return { ok: false as const, status: 404, error: "Post not found." };

  if (post.author_id) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== post.author_id)
      return { ok: false as const, status: 403, error: "Not your post." };
    return { ok: true as const, admin };
  }

  // Guest post: check PIN.
  if (!pin || !post.guest_password_hash)
    return { ok: false as const, status: 401, error: "PIN required." };
  const match = await bcrypt.compare(pin, post.guest_password_hash);
  if (!match) return { ok: false as const, status: 401, error: "Wrong PIN." };
  return { ok: true as const, admin };
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const postId = Number(id);
  const body = await req.json().catch(() => ({}));
  const auth = await authorize(postId, body.pin);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const title = String(body.title ?? "").trim();
  const text = String(body.body ?? "").trim();
  if (!title || !text)
    return NextResponse.json({ error: "Title and body are required." }, { status: 400 });

  const { error } = await auth.admin
    .from("posts")
    .update({ title, body: text })
    .eq("id", postId);
  if (error) return NextResponse.json({ error: "Update failed." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const postId = Number(id);
  const body = await req.json().catch(() => ({}));
  const auth = await authorize(postId, body.pin);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { error } = await auth.admin
    .from("posts")
    .update({ is_deleted: true })
    .eq("id", postId);
  if (error) return NextResponse.json({ error: "Delete failed." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
