import { redirect } from "next/navigation";
import VerifySubmitForm from "@/components/VerifySubmitForm";
import WithdrawButton from "@/components/WithdrawButton";
import { getViewer } from "@/lib/viewer";
import { latestVerification } from "@/lib/verify";
import { fullDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function VerifySubmitPage() {
  const { userId, profile, unit } = await getViewer();
  if (!userId) redirect("/verify");
  if (!profile) redirect("/onboarding");

  const latest = await latestVerification(userId);
  const pending = latest?.status === "pending" ? latest : null;

  return (
    <div className="mx-auto max-w-2xl py-4">
      <h1 className="mb-1 text-[20px] font-bold text-ink">
        {profile.is_verified ? "Update your total" : "Submit your lifts"}
      </h1>
      <p className="mb-4 text-muted">
        Enter your Big 3 and upload proof for each lift. An admin reviews every
        submission before your badge goes live.
      </p>

      {pending ? (
        <div className="border border-hairline p-4">
          <h2 className="mb-2 text-base font-bold text-ink">Under review</h2>
          <p className="text-muted">
            You submitted on {fullDate(pending.created_at)}. An admin is reviewing
            your proof — this usually takes 24–48 hours.
          </p>
          <table className="board mt-3 max-w-sm">
            <tbody>
              <tr>
                <td>Squat</td>
                <td>{pending.squat} {pending.submitted_unit}</td>
              </tr>
              <tr>
                <td>Bench</td>
                <td>{pending.bench} {pending.submitted_unit}</td>
              </tr>
              <tr>
                <td>Deadlift</td>
                <td>{pending.deadlift} {pending.submitted_unit}</td>
              </tr>
            </tbody>
          </table>
          <div className="mt-3">
            <WithdrawButton />
          </div>
        </div>
      ) : (
        <>
          {latest?.status === "rejected" && (
            <div className="mb-4 border border-accent bg-[#fdecea] p-3">
              <strong className="text-accent">Your last submission was rejected.</strong>
              {latest.admin_note && (
                <p className="mt-1 text-ink">Admin note: {latest.admin_note}</p>
              )}
            </div>
          )}
          <VerifySubmitForm defaultUnit={unit ?? profile.unit} />
        </>
      )}
    </div>
  );
}
