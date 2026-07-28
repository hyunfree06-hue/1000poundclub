"use client";

import { useEffect } from "react";

// Marks the "Verified. You're <TIER>." confirmation as seen so it only shows
// once (keyed on verified_at). No refresh — it simply won't render next load.
export default function AckVerified({ token }: { token: string }) {
  useEffect(() => {
    document.cookie = `ack_verified=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, [token]);
  return null;
}
