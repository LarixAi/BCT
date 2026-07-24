import { createFileRoute, Link } from "@tanstack/react-router";
import { useSessionStore } from "@/platform/auth/session-store";
import { useTenancyStore } from "@/platform/tenancy/context-store";

export const Route = createFileRoute("/_public/module-unavailable")({
  component: ModuleUnavailablePage,
});

function ModuleUnavailablePage() {
  const signOut = useSessionStore(s => s.signOut);
  const clearContext = useTenancyStore(s => s.clearContext);

  function handleSignOut() {
    clearContext();
    signOut();
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-[#0B1526] px-6 text-white">
      <section className="w-full max-w-md text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-[#12A89D]">VEYVIO YARD</p>
        <h1 className="mt-4 text-2xl font-semibold">Yard is not on this plan</h1>
        <p className="mt-3 text-sm leading-6 text-white/75">
          Your company&apos;s Veyvio licence does not include Yard. Ask your administrator or Veyvio
          support if this depot needs yard operations.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Link
            to="/company-select"
            className="rounded-xl bg-[#12A89D] px-4 py-3 text-sm font-semibold text-[#0B1526]"
          >
            Choose another company
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-white/20 px-4 py-3 text-sm font-semibold text-white"
          >
            Sign out
          </button>
        </div>
      </section>
    </main>
  );
}
