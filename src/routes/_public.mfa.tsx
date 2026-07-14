import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSessionStore } from "@/platform/auth/session-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_public/mfa")({
  head: () => ({ meta: [{ title: "Verify identity — Veyvio Yard" }] }),
  component: MfaPage,
});

function MfaPage() {
  const navigate = useNavigate();
  const completeMfa = useSessionStore(s => s.completeMfa);
  const enableBiometric = useSessionStore(s => s.enableBiometric);
  const [code, setCode] = useState("");
  const [trusted, setTrusted] = useState(true);

  function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (code.length < 6) return;
    completeMfa();
    if (trusted) enableBiometric();
    navigate({ to: "/company-select" });
  }

  return (
    <div className="space-y-6 animate-in-up max-w-md mx-auto">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Verify identity</h1>
        <p className="mt-1 text-sm text-muted">Enter the 6-digit code from your authenticator app.</p>
      </div>
      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfa">Authenticator code</Label>
          <Input id="mfa" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} placeholder="000000" className="font-mono text-lg tracking-widest" />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={trusted} onChange={e => setTrusted(e.target.checked)} className="rounded-xs" />
          Remember trusted device
        </label>
        <Button type="submit" disabled={code.length < 6} className="w-full bg-accent hover:bg-accent/90 text-white uppercase tracking-widest font-bold">
          Verify
        </Button>
      </form>
      <p className="text-center text-[10px] text-muted uppercase tracking-widest">Resend code · Use recovery code</p>
    </div>
  );
}
