import { createFileRoute } from "@tanstack/react-router";
import { handleMutationsRequest } from "@/platform/api/server-handlers";

export const Route = createFileRoute("/api/v1/yard/mutations")({
  server: {
    handlers: {
      POST: ({ request }) => handleMutationsRequest(request),
    },
  },
});
