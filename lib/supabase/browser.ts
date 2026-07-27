import { createBrowserClient } from "@supabase/ssr";

// Client-side Supabase client. Uses the public anon key only.
// All privileged writes go through server routes — never write directly here
// in ways that would depend on trusting the client.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
