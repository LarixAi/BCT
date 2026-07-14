import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/account-restricted")({
  component: () => (
    <div className="text-center space-y-4 animate-in-up">
      <h1 className="font-display text-2xl font-extrabold text-vor">Access restricted</h1>
      <p className="text-sm text-muted">This account has been suspended. Contact your company administrator.</p>
      <Link to="/sign-in" className="text-[10px] font-bold uppercase tracking-widest text-primary">Back to sign in</Link>
    </div>
  ),
});
