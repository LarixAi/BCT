import { createFileRoute } from "@tanstack/react-router";
import { handleBootstrapRequest } from "@/platform/api/server-handlers";

export const Route = createFileRoute("/api/v1/yard/bootstrap")({
  server: {
    handlers: {
      GET: ({ request }) => handleBootstrapRequest(request),
    },
  },
});
