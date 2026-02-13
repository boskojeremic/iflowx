"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Tenant = {
  id: string;
  name: string;
  code: string;
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/admin/tenants");
      const d = await r.json();
      if (d.ok) setTenants(d.tenants);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="max-w-3xl mx-auto p-6 text-white">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Tenants</h1>

        <Link
          href="/admin/tenants/new"
          className="px-4 py-2 bg-purple-600 rounded hover:bg-purple-700"
        >
          + Create Tenant
        </Link>
      </div>

      {loading && <p>Loading…</p>}

      {!loading && tenants.length === 0 && (
        <p className="opacity-70">No tenants yet.</p>
      )}

      <ul className="space-y-3">
        {tenants.map((t) => (
          <li
            key={t.id}
            className="border border-white/20 rounded p-4"
          >
            <div className="font-semibold">{t.name}</div>
            <div className="text-sm opacity-70">
              Code: {t.code}
            </div>
            <div className="text-xs opacity-50 mt-1">
              ID: {t.id}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
