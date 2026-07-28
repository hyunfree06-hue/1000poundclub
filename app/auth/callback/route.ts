import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// OAuth redirect target. Exchanges the code for a session, then routes the user
// to onboarding (no profile yet) or their intended next page.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/verify/submit";
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? url.origin;

  if (!code) return NextResponse.redirect(`${origin}/verify`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/verify`);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) return NextResponse.redirect(`${origin}/onboarding`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
