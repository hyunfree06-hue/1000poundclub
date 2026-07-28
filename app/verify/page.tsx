import { redirect } from "next/navigation";
import GoogleSignIn from "@/components/GoogleSignIn";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

// Auth page. Framed entirely as verification.
export default async function VerifyPage() {
  const { userId, profile } = await getViewer();

  if (userId) {
    // Already signed in: send them where they need to go.
    redirect(profile ? "/verify/submit" : "/onboarding");
  }

  return (
    <div className="mx-auto max-w-md py-10 text-center">
      <h1 className="text-[24px] font-bold text-ink">Prove your Big 3.</h1>
      <p className="mt-2 text-muted">
        Sign in with Google to submit your lifts and claim your tier.
      </p>
      <div className="mt-5 flex justify-center">
        <GoogleSignIn next="/verify/submit" />
      </div>
    </div>
  );
}
