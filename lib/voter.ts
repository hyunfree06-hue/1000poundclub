import { cookies } from "next/headers";
import { randomUUID } from "crypto";

const VOTER_COOKIE = "voter_key";

// A stable per-browser voter key for guests, stored in a long-lived cookie.
// Signed-in users use their user id as the voter_key instead (handled in the
// vote route). Must be called from a route handler / server action where the
// cookie store is writable.
export async function getOrCreateVoterKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(VOTER_COOKIE)?.value;
  if (existing) return existing;

  const key = randomUUID();
  store.set(VOTER_COOKIE, key, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: "lax",
  });
  return key;
}

export async function readVoterKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(VOTER_COOKIE)?.value ?? null;
}
