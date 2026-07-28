import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const commentId = Number(id);
  const body = await req.json().catch(() => ({}));
  const pin: string | undefined = body.pin;

  const admin = createAdminClient();
  const { data: comment } = await admin
    .from("comments")
    .select("id, post_id, author_id, guest_password_hash, is_deleted")
    .eq("id", commentId)
    .maybeSingle();

  if (!comment || comment.is_deleted)
    return NextResponse.json({ error: "Comment not found." }, { status: 404 });

  if (comment.author_id) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || user.id !== comment.author_id)
      return NextResponse.json({ error: "Not your comment." }, { status: 403 });
  } else {
    if (!pin || !comment.guest_password_hash)
      return NextResponse.json({ error: "PIN required." }, { status: 401 });
    const ok = await bcrypt.compare(pin, comment.guest_password_hash);
    if (!ok) return NextResponse.json({ error: "Wrong PIN." }, { status: 401 });
  }

  const { error } = await admin
    .from("comments")
    .update({ is_deleted: true })
    .eq("id", commentId);
  if (error) return NextResponse.json({ error: "Delete failed." }, { status: 500 });

  await admin.rpc("bump_comment_count", { p_id: comment.post_id, delta: -1 });
  return NextResponse.json({ ok: true });
}
