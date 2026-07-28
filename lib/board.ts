import { createClient } from "@/lib/supabase/server";

export const PAGE_SIZE = 30;
export type Sort = "latest" | "top24h" | "topweek";

export interface PostRow {
  id: number;
  title: string;
  image_paths: string[] | null;
  views: number;
  votes: number;
  comment_count: number;
  created_at: string;
  guest_name: string | null;
  author_tier: string | null;
  author_total_lb: number | null;
  author: { username: string } | null;
}

// Explicit column list — NEVER select guest_password_hash.
const LIST_COLUMNS =
  "id, title, image_paths, views, votes, comment_count, created_at, guest_name, author_tier, author_total_lb, author:profiles(username)";

export interface ListParams {
  sort: Sort;
  page: number;
  q?: string;
}

export async function listPosts({ sort, page, q }: ListParams): Promise<{
  rows: PostRow[];
  total: number;
}> {
  const supabase = await createClient();

  let query = supabase
    .from("posts")
    .select(LIST_COLUMNS, { count: "exact" })
    .eq("is_deleted", false);

  // Time window for the "Top" tabs.
  if (sort === "top24h") {
    query = query.gte(
      "created_at",
      new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    );
  } else if (sort === "topweek") {
    query = query.gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    );
  }

  // Search title / body / author (guest name + member username).
  const term = q?.trim();
  if (term) {
    // Strip characters that would break PostgREST's ilike / or() grammar.
    const like = `%${term.replace(/[%_,()*]/g, "")}%`;
    const { data: authors } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", like)
      .limit(50);
    const authorIds = (authors ?? []).map((a) => a.id as string);

    const ors = [`title.ilike.${like}`, `body.ilike.${like}`, `guest_name.ilike.${like}`];
    if (authorIds.length) ors.push(`author_id.in.(${authorIds.join(",")})`);
    query = query.or(ors.join(","));
  }

  if (sort === "latest") {
    query = query.order("created_at", { ascending: false });
  } else {
    query = query
      .order("votes", { ascending: false })
      .order("created_at", { ascending: false });
  }

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, count, error } = await query;
  if (error) throw error;

  return {
    rows: (data ?? []) as unknown as PostRow[],
    total: count ?? 0,
  };
}
