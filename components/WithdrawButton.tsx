"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function withdraw() {
    setBusy(true);
    await fetch("/api/verifications/withdraw", { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  return (
    <button type="button" onClick={withdraw} disabled={busy} className="btn">
      {busy ? "Withdrawing…" : "Withdraw"}
    </button>
  );
}
