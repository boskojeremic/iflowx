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
    try {
      const r = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, code }),
      });

      const text = await r.text();
      if (!r.ok) {
        alert(`CREATE FAILED (${r.status}): ${text}`);
        return;
      }

      const d = JSON.parse(text);
      if (d.ok) {
        router.push("/admin/tenants");
      } else {
        alert(d.error || "FAILED");
      }
    } catch {
      alert("Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Create Tenant</h1>

      <label className="block text-sm font-medium mb-1">Name</label>
      <input
        className="border p-2 w-full rounded mb-4"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label className="block text-sm font-medium mb-1">
        Code (optional, auto-generated)
      </label>
      <input
        className="border p-2 w-full rounded mb-4"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="DEMO"
      />

      <button
        onClick={createTenant}
        disabled={loading || !name}
        className="bg-black text-white px-4 py-2 rounded disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create"}
      </button>
    </div>
  );
}
