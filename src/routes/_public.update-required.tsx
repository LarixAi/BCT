import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_public/update-required")({
  component: () => (
    <div className="text-center space-y-4 animate-in-up">
      <h1 className="font-display text-2xl font-extrabold">Update required</h1>
      <p className="text-sm text-muted">A mandatory update is available. Please update Veyvio Yard to continue.</p>
    </div>
  ),
});
