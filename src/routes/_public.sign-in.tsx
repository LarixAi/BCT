import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSessionStore } from "@/platform/auth/session-store";
import { getConnectionQuality } from "@/platform/device/connectivity";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { yardCopy } from "@/copy/yard-messages";

export const Route = createFileRoute("/_public/sign-in")({
  head: () => ({ meta: [{ title: "Sign in — Veyvio Yard" }] }),
  component: SignInPage,
});

function SignInPage() {
  const navigate = useNavigate();
  const signIn = useSessionStore(s => s.signIn);
  const [email, setEmail] = useState("j.miller@northwest-transport.co.uk");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connection = getConnectionQuality();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signIn({ email, password, rememberDevice: remember });
      navigate({ to: "/mfa" });
    } catch {
      setError(yardCopy.auth.signInFailed);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-in-up max-w-md mx-auto">
      <div>
        <h1 className="font-marketing text-2xl font-extrabold tracking-tight">{yardCopy.auth.signInTitle}</h1>
        <p className="mt-1 text-sm text-muted">{yardCopy.auth.signInSupporting}</p>
      </div>

      <div className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-xs border inline-flex ${
        connection === "online" ? "border-ok/30 text-ok bg-ok/10"
        : connection === "weak" ? "border-warn/40 text-warn bg-warn/10"
        : "border-border text-muted bg-secondary"
      }`}>
        {connection === "online" ? yardCopy.auth.online : connection === "weak" ? yardCopy.auth.weakConnection : yardCopy.auth.offlineAuth}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="flex gap-2">
            <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Button type="button" variant="outline" className="shrink-0 text-xs" onClick={() => setShowPassword(v => !v)}>
              {showPassword ? "Hide" : "Show"}
            </Button>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="rounded-xs" />
          Remember this device
        </label>
        {error && <p className="text-sm text-vor">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full bg-accent hover:bg-accent/90 text-white uppercase tracking-widest font-bold">
          {loading ? yardCopy.auth.signingIn : yardCopy.buttons.signIn}
        </Button>
      </form>

      <div className="flex flex-col gap-2 text-center text-[10px] font-bold uppercase tracking-widest">
        <Link to="/sign-in" className="text-primary hover:underline">Activate invited account</Link>
        <span className="text-muted">Contact support</span>
      </div>
    </div>
  );
}
