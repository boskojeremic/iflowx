"use client";

import { useEffect, useState } from "react";

type TenantItem = {
  id: string;
  name: string;
  code: string;
};

export default function InvitePage() {
  const [tenants, setTenants] = useState<TenantItem[]>([]);
  const [tenantId, setTenantId] = useState("");

  const [email, setEmail] = useState("");
  const [role, setRole] = useState("VIEWER");
  const [inviteUrl, setInviteUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Load tenants for dropdown
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/admin/tenants");
        const d = await r.json();

        if (d.ok && Array.isArray(d.tenants)) {
          setTenants(d.tenants);
          if (!tenantId && d.tenants.length > 0) {
            setTenantId(d.tenants[0].id);
          }
        } else {
          console.error("Failed to load tenants:", d);
        }
      } catch (e) {
        console.error("Tenant load error:", e);
      }
    })();
  }, []);

  async function createInvite() {
    setInviteUrl("");
    setLoading(true);

    try {
      const r = await fetch("/api/admin/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId,
          email,
          role,
        }),
      });

      const text = await r.text();

      if (!r.ok) {
        alert(`INVITE FAILED (${r.status}): ${text}`);
        return;
      }

      const d = JSON.parse(text);
      if (d.ok) {
        setInviteUrl(d.inviteUrl);
      } else {
        alert(d.error || "Invite failed");
      }
    } catch (e) {
      console.error("Invite error:", e);
      alert("Unexpected error creating invite");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Create Invite</h1>

      {/* TENANT */}
      <label className="block text-sm font-medium mb-1">Tenant</label>
      <select
        className="border p-2 w-full rounded mb-4"
        value={tenantId}
        onChange={(e) => setTenantId(e.target.value)}
      >
        {tenants.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name} ({t.code})
          </option>
        ))}
      </select>

      {/* EMAIL */}
      <label className="block text-sm font-medium mb-1">Email</label>
      <input
        className="border p-2 w-full rounded mb-4"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {/* ROLE */}
      <label className="block text-sm font-medium mb-1">Role</label>
      <select
        className="border p-2 w-full rounded mb-4"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="OWNER">OWNER</option>
        <option value="ADMIN">ADMIN</option>
        <option value="EDITOR">EDITOR</option>
        <option value="VIEWER">VIEWER</option>
      </select>

      <button
        onClick={createInvite}
        disabled={loading || !tenantId || !email}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Invite"}
      </button>

      {/* RESULT */}
      {inviteUrl && (
  <div className="mt-4 p-3 border rounded bg-black/70 text-white">
    <div className="text-sm mb-1 text-gray-300">Invite link:</div>
    <code className="break-all text-sm text-green-400">
      {inviteUrl}
    </code>
  </div>
)}

    </div>
  );
}
