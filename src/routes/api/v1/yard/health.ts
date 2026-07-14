import { createFileRoute } from "@tanstack/react-router";
import { handleHealthRequest } from "@/platform/api/server-handlers";

export const Route = createFileRoute("/api/v1/yard/health")({
  server: {
    handlers: {
      GET: () => handleHealthRequest(),
    },
  },
});
