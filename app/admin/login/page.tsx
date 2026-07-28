import { loginAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="mx-auto max-w-xs py-12">
      <h1 className="text-[18px] font-bold text-ink">Admin</h1>
      <p className="mb-4 mt-1 text-muted">Enter the admin password.</p>

      <form action={loginAction} className="flex flex-col gap-2">
        <input
          name="password"
          type="password"
          inputMode="numeric"
          autoFocus
          required
          placeholder="Password"
          className="border border-hairline px-2 py-1 text-base outline-none focus:border-accent"
          style={{ borderRadius: 2 }}
        />
        <button type="submit" className="btn btn-accent">
          Enter
        </button>
      </form>

      {error === "locked" ? (
        <p className="mt-3 text-accent">
          Too many attempts. Try again in a few minutes.
        </p>
      ) : error ? (
        <p className="mt-3 text-accent">Wrong password.</p>
      ) : null}
    </div>
  );
}
