import { redirect } from "next/navigation";
import OnboardingForm from "@/components/OnboardingForm";
import { getViewer } from "@/lib/viewer";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const { userId, profile } = await getViewer();
  if (!userId) redirect("/verify");
  if (profile) redirect("/verify/submit");

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-[20px] font-bold text-ink">Pick your handle.</h1>
      <p className="mb-4 mt-1 text-muted">
        This is how you&apos;ll show up on the board. You can change it later.
      </p>
      <OnboardingForm />
    </div>
  );
}
