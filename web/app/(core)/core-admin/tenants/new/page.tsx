"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewTenantPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function createTenant() {
    setLoading(true);

    const r = await fetch("/api/admin/tenants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, code }),
    });

    const d = await r.json();
    setLoading(false);

    if (!d.ok) {
      alert(d.error || "FAILED");
      return;
    }

    router.push("/admin/tenants");
  }

  return (
    <div className="max-w-xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Create Tenant</h1>

      <div className="space-y-4">
        <div>
          <label className="block mb-1 text-sm">Name</label>
          <input
            className="w-full p-2 rounded bg-black/40 border border-white/20"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Demo Client"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm">Code</label>
          <input
            className="w-full p-2 rounded bg-black/40 border border-white/20 uppercase"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="DEMO"
          />
        </div>

        <button
          onClick={createTenant}
          disabled={loading || !name || !code}
          className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Tenant"}
        </button>
      </div>
    </div>
  );
}
