"use client";

import { useEffect, useState } from "react";

export default function InviteClient({ token }: { token: string }) {
  const [email, setEmail] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>(""); // name from DB (optional)
  const [tenantLabel, setTenantLabel] = useState<string>("");
  const [role, setRole] = useState<string>("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setStatus("loading");
        setError("");

        const r = await fetch(`/api/invites/verify?token=${encodeURIComponent(token)}`, {
          cache: "no-store",
        });
        const d = await r.json().catch(() => null);

        if (!alive) return;

        if (!r.ok || !d?.ok) {
          setStatus("error");
          setError(d?.error || `VERIFY_FAILED_${r.status}`);
          return;
        }

        setEmail(String(d.email || ""));
setTenantLabel(`${d.tenant?.name ?? ""} (${d.tenant?.code ?? ""})`);
setRole(String(d.role || ""));
setDisplayName(String(d.name || "")); // ✅ SHOW NAME

        // OPTIONAL: if your verify endpoint returns name, show it:
        // setDisplayName(String(d.name || ""));
        // If not available, you can keep blank or show email as fallback.
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
      if (password !== confirmPassword) {
        setError("PASSWORDS_DO_NOT_MATCH");
        return;
      }

      const r = await fetch("/api/invites/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const d = await r.json().catch(() => null);

      if (!r.ok || !d?.ok) {
        setError(d?.error || `ACCEPT_FAILED_${r.status}`);
        return;
      }

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
      <div className="border border-white/15 rounded-xl p-6 w-[420px] space-y-4 bg-black/20">
        <h1 className="text-xl font-semibold">Complete your registration</h1>

        <div className="text-sm opacity-80 space-y-1">
          <div>
            <b>Tenant:</b> {tenantLabel}
          </div>
          <div>
            <b>Email:</b> {email}
          </div>
          {displayName ? (
            <div>
              <b>Name:</b> {displayName}
            </div>
          ) : null}
          <div>
            <b>Role:</b> {role}
          </div>
        </div>

        <div className="space-y-2">
          <input
            className="w-full h-10 px-3 rounded-md border border-white/10 bg-white/[0.04] text-white outline-none"
            placeholder="Password (min 8 chars)"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <input
            className="w-full h-10 px-3 rounded-md border border-white/10 bg-white/[0.04] text-white outline-none"
            placeholder="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") accept();
            }}
          />
        </div>

        {error && <div className="text-red-400 text-sm">{error}</div>}

        <button
          type="button"
          className="w-full h-10 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={accept}
        >
          Accept invite
        </button>
      </div>
    </div>
  );
}