import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role Supabase client. Bypasses RLS entirely.
//
// SECURITY: This module imports "server-only", so any accidental import from a
// Client Component will fail the build. The service role key must NEVER be
// shipped to the browser. Use this only inside server routes and server actions
// for trusted writes: creating posts/comments, reviewing verifications, setting
// lift columns, generating signed proof URLs, etc.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing SUPABASE env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
