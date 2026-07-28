"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TierBadge from "@/components/TierBadge";
import { approveVerification, rejectVerification } from "@/app/admin/actions";
import { kgToLb } from "@/lib/units";
import { getTier } from "@/lib/tiers";
import { fullDate } from "@/lib/format";

export interface QueueRow {
  id: string;
  username: string;
  submitted_unit: "lb" | "kg";
  claimed: { squat: number; bench: number; deadlift: number };
  current: {
    squat_lb: number | null;
    bench_lb: number | null;
    deadlift_lb: number | null;
    total_lb: number | null;
    is_verified: boolean;
  };
  note: string | null;
  admin_note: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  proofs: { label: string; url: string | null; kind: "image" | "video" }[];
  // True once the verification has been reviewed and its proof files deleted.
  proofsDeleted: boolean;
}

function lb(v: number, unit: "lb" | "kg") {
  return Math.round(unit === "kg" ? kgToLb(v) : v);
}

function Proof({ p }: { p: QueueRow["proofs"][number] }) {
  if (!p.url)
    return (
      <div className="border border-hairline p-2 text-xs text-muted">
        {p.label}: proof unavailable
      </div>
    );
  return (
    <figure className="border border-hairline p-1">
      <figcaption className="mb-1 text-xs font-bold text-muted">{p.label}</figcaption>
      {p.kind === "video" ? (
        <video src={p.url} controls className="max-h-72 w-full bg-black" />
      ) : (
        <a href={p.url} target="_blank" rel="noreferrer">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt={p.label} className="max-h-72 w-full object-contain" />
        </a>
      )}
    </figure>
  );
}

function Row({ row }: { row: QueueRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(row.status === "pending");
  const [mode, setMode] = useState<null | "edit" | "reject">(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const u = row.submitted_unit;

  const [sq, setSq] = useState(row.claimed.squat);
  const [bn, setBn] = useState(row.claimed.bench);
  const [dl, setDl] = useState(row.claimed.deadlift);
  const [note, setNote] = useState("");

  const claimedTotalLb =
    lb(row.claimed.squat, u) + lb(row.claimed.bench, u) + lb(row.claimed.deadlift, u);
  const editTotalLb = lb(sq, u) + lb(bn, u) + lb(dl, u);

  async function doApprove(edited: boolean) {
    setBusy(true);
    setMsg(null);
    const res = await approveVerification(
      row.id,
      edited ? { squat: sq, bench: bn, deadlift: dl } : null,
    );
    setBusy(false);
    if (res?.error) return setMsg(res.error);
    router.refresh();
  }

  async function doReject() {
    setBusy(true);
    setMsg(null);
    await rejectVerification(row.id, note);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="border-b border-hairline">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2 py-2 text-left hover:bg-[#fafafa]"
      >
        <span className="text-muted">{open ? "▾" : "▸"}</span>
        <span className="font-bold text-ink">{row.username}</span>
        <TierBadge totalLb={claimedTotalLb} unit={u} />
        <span className="ml-auto text-xs text-muted">{fullDate(row.created_at)}</span>
      </button>

      {open && (
        <div className="px-6 pb-4">
          <table className="board max-w-lg">
            <thead>
              <tr>
                <th>Lift</th>
                <th>Current</th>
                <th>Claimed ({u})</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Squat</td>
                <td>{row.current.squat_lb ?? "—"}</td>
                <td>{row.claimed.squat}</td>
              </tr>
              <tr>
                <td>Bench</td>
                <td>{row.current.bench_lb ?? "—"}</td>
                <td>{row.claimed.bench}</td>
              </tr>
              <tr>
                <td>Deadlift</td>
                <td>{row.current.deadlift_lb ?? "—"}</td>
                <td>{row.claimed.deadlift}</td>
              </tr>
              <tr>
                <td className="font-bold">Total (lb)</td>
                <td className="font-bold">{row.current.total_lb ?? "—"}</td>
                <td className="font-bold">
                  {claimedTotalLb} → {getTier(claimedTotalLb).name}
                </td>
              </tr>
            </tbody>
          </table>

          {row.note && (
            <p className="mt-2 text-xs text-muted">
              User note: <span className="text-ink">{row.note}</span>
            </p>
          )}
          {row.admin_note && (
            <p className="mt-1 text-xs text-muted">
              Admin note: <span className="text-ink">{row.admin_note}</span>
            </p>
          )}

          {row.proofsDeleted ? (
            <div className="mt-3 border border-hairline bg-[#fafafa] p-3 text-xs text-muted">
              Proof deleted after review.
            </div>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {row.proofs.map((p) => (
                <Proof key={p.label} p={p} />
              ))}
            </div>
          )}

          {row.status === "pending" && (
            <div className="mt-3 flex flex-col gap-2">
              {mode === "edit" && (
                <div className="flex flex-wrap items-end gap-2 border border-hairline bg-[#fafafa] p-2">
                  {(
                    [
                      ["Squat", sq, setSq],
                      ["Bench", bn, setBn],
                      ["Deadlift", dl, setDl],
                    ] as const
                  ).map(([label, val, setter]) => (
                    <label key={label} className="flex flex-col gap-1 text-xs text-muted">
                      {label} ({u})
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => setter(Number(e.target.value))}
                        className="border border-hairline px-2 py-1 text-base text-ink outline-none focus:border-accent"
                        style={{ borderRadius: 2, width: 90 }}
                      />
                    </label>
                  ))}
                  <span className="text-xs text-muted">
                    New total: {editTotalLb} lb → {getTier(editTotalLb).name}
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => doApprove(true)}
                    className="btn btn-accent"
                  >
                    Save &amp; approve
                  </button>
                </div>
              )}

              {mode === "reject" && (
                <div className="flex flex-col gap-2 border border-hairline bg-[#fafafa] p-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Reason shown to the user (optional)"
                    rows={2}
                    className="border border-hairline px-2 py-1 text-base text-ink outline-none focus:border-accent"
                    style={{ borderRadius: 2 }}
                  />
                  <button type="button" disabled={busy} onClick={doReject} className="btn btn-accent self-start">
                    Confirm reject
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => doApprove(false)} className="btn btn-accent">
                  Approve
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode((m) => (m === "edit" ? null : "edit"))}
                  className="btn"
                >
                  Approve with edited numbers
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode((m) => (m === "reject" ? null : "reject"))}
                  className="btn"
                >
                  Reject
                </button>
              </div>
            </div>
          )}

          {msg && <p className="mt-2 text-accent">{msg}</p>}
        </div>
      )}
    </div>
  );
}

export default function AdminQueue({
  rows,
  status,
}: {
  rows: QueueRow[];
  status: "pending" | "approved" | "rejected";
}) {
  if (rows.length === 0)
    return (
      <p className="py-8 text-center text-muted">
        No {status} verifications.
      </p>
    );
  return (
    <div className="border-t border-hairline">
      {rows.map((r) => (
        <Row key={r.id} row={r} />
      ))}
    </div>
  );
}
