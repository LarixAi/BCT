import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BackendUnavailable({ message }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white rounded-2xl border shadow-sm p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto text-2xl">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-slate-900">Backend not available</h1>
        <p className="text-slate-600 text-sm leading-relaxed">
          {message || "The Base44 backend for this app is not reachable or has not been published yet."}
        </p>
        <Button asChild className="w-full">
          <a href="https://base44.com" target="_blank" rel="noreferrer">
            Open Base44 Dashboard
            <ExternalLink className="w-4 h-4 ml-2" />
          </a>
        </Button>
        <p className="text-xs text-slate-400">
          After publishing, add <code className="bg-slate-100 px-1 rounded">VITE_BASE44_APP_BASE_URL</code> to{" "}
          <code className="bg-slate-100 px-1 rounded">.env.local</code> and restart the dev server.
        </p>
      </div>
    </div>
  );
}
