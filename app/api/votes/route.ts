import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateVoterKey } from "@/lib/voter";

// Toggle-safe upvote: one vote per voter_key per post. Signed-in users vote
// with their user id; guests with a long-lived cookie key.
export async function POST(req: Request) {
  let postId: number;
  try {
    const json = await req.json();
    postId = Number(json.postId);
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  if (!Number.isInteger(postId))
    return NextResponse.json({ error: "Bad request." }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const voterKey = user ? `u:${user.id}` : await getOrCreateVoterKey();

  const admin = createAdminClient();

  const { error: insErr } = await admin
    .from("post_votes")
    .insert({ post_id: postId, voter_key: voterKey });

  if (insErr) {
    // Duplicate primary key => already voted.
    if (insErr.code === "23505")
      return NextResponse.json({ error: "You already voted." }, { status: 409 });
    return NextResponse.json({ error: "Could not vote." }, { status: 500 });
  }

  // Recompute the denormalized count from the source of truth.
  const { count } = await admin
    .from("post_votes")
    .select("*", { count: "exact", head: true })
    .eq("post_id", postId);

  await admin.from("posts").update({ votes: count ?? 0 }).eq("id", postId);

  return NextResponse.json({ votes: count ?? 0 });
}
