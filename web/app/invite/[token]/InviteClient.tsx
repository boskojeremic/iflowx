"use client";

import { useEffect, useState } from "react";

export default function InviteClient({ token }: { token: string }) {
  const [email, setEmail] = useState<string>("");
  const [tenantLabel, setTenantLabel] = useState<string>("");
  const [role, setRole] = useState<string>("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setStatus("loading");
        setError("");

        const r = await fetch(`/api/invites/verify?token=${encodeURIComponent(token)}`);
        const d = await r.json().catch(() => null);

        if (!alive) return;

        if (!r.ok || !d?.ok) {
          setStatus("error");
          setError(d?.error || `VERIFY_FAILED_${r.status}`);
          return;
        }

        setEmail(d.email);
        setTenantLabel(`${d.tenant.name} (${d.tenant.code})`);
        setRole(d.role);
        setStatus("ready");
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setStatus("error");
        setError("NETWORK_OR_SERVER_ERROR");
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  async function accept() {
    try {
      setError("");

      if (!password || password.length < 8) {
        setError("PASSWORD_MIN_8_CHARS");
        return;
      }

      const r = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });

      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        setError(d?.error || `ACCEPT_FAILED_${r.status}`);
        return;
      }

      // nakon accept → vodi na login
      window.location.href = "/login";
    } catch (e) {
      console.error(e);
      setError("NETWORK_OR_SERVER_ERROR");
    }
  }

  if (status === "loading") return <div className="p-6 text-white">Loading invite…</div>;
  if (status === "error") return <div className="p-6 text-white">Invite error: {error}</div>;

  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <div className="border border-white/15 rounded-xl p-6 w-[420px] space-y-3 bg-black/20">
        <h1 className="text-xl font-semibold">Complete your registration</h1>

        <div className="text-sm opacity-80">
          <div><b>Tenant:</b> {tenantLabel}</div>
          <div><b>Email:</b> {email}</div>
          <div><b>Role:</b> {role}</div>
        </div>

        <input
          className="w-full py-2 rounded-md bg-black text-white hover:bg-black/80"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          className="w-full py-2 rounded-md bg-black text-white hover:bg-black/80"
          placeholder="Password (min 8 chars)"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <button
  type="button"
  className="w-full py-2 rounded-md bg-black text-white hover:bg-black/80"
  onClick={accept}
>  Accept invite
</button>

      </div>
    </div>
  );
}
