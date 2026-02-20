import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";

function daysBetween(now: Date, end: Date) {
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export default async function AdminDashboardPage() {
  const session = (await getServerSession(authOptions as any)) as any;
  const email = session?.user?.email;
  if (!email) redirect("/login");

  // Ne oslanjamo se na session.isSuperAdmin (da ne diramo auth sada)
  const me = await db.user.findUnique({
    where: { email },
    select: { isSuperAdmin: true, name: true, email: true },
  });

  if (!me?.isSuperAdmin) redirect("/");

  const now = new Date();
  const soonDays = 14;
  const soonDate = new Date(now.getTime() + soonDays * 24 * 60 * 60 * 1000);

  // Tenants
  const tenants = await db.tenant.findMany({
    select: {
      id: true,
      name: true,
      code: true,
      seatLimit: true,
      licenseStartsAt: true,
      licenseEndsAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Membership seats used (ACTIVE)
  const seatsUsed = await db.membership.count({
    where: { status: "ACTIVE" },
  });

  const totalTenants = tenants.length;
  const totalSeats = tenants.reduce((acc, t) => acc + (t.seatLimit ?? 0), 0);

  const activeTenants = tenants.filter((t) => {
    if (!t.licenseStartsAt || !t.licenseEndsAt) return false;
    return t.licenseStartsAt <= now && now <= t.licenseEndsAt;
  });

  const expiringSoon = tenants.filter((t) => {
    if (!t.licenseEndsAt) return false;
    // važi samo ako nije već isteklo
    return t.licenseEndsAt >= now && t.licenseEndsAt <= soonDate;
  });

  // Top expiring list (sort by closest end)
  const topExpiring = expiringSoon
    .slice()
    .sort((a, b) => (a.licenseEndsAt!.getTime() - b.licenseEndsAt!.getTime()))
    .slice(0, 8);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Licencor Dashboard</h1>
          <div className="text-sm text-white/60">
            Logged in as {me.name ?? me.email}
          </div>
        </div>

        <Link
          href="/admin/tenants"
          className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white hover:bg-white/15"
        >
          Manage Tenants
        </Link>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card title="Total Tenants" value={String(totalTenants)} />
        <Card title="Active Licenses" value={String(activeTenants.length)} />
        <Card title={`Expiring ≤ ${soonDays} days`} value={String(expiringSoon.length)} />
        <Card title="Total Seats" value={String(totalSeats)} />
        <Card title="Seats Used (ACTIVE)" value={String(seatsUsed)} />
      </div>

      {/* Expiring list */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold text-white">Expiring soon</div>
          <div className="text-sm text-white/60">Next {soonDays} days</div>
        </div>

        {topExpiring.length === 0 ? (
          <div className="mt-4 text-white/70 text-sm">No tenants expiring soon.</div>
        ) : (
          <div className="mt-4 rounded-xl overflow-hidden border border-white/10">
            <table className="w-full text-sm text-white">
              <thead className="bg-white/5">
                <tr>
                  <th className="p-3 text-left">Tenant</th>
                  <th className="p-3 text-left">Code</th>
                  <th className="p-3 text-left">Seats</th>
                  <th className="p-3 text-left">Ends</th>
                  <th className="p-3 text-left">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {topExpiring.map((t, idx) => {
                  const remaining = t.licenseEndsAt ? daysBetween(now, t.licenseEndsAt) : null;
                  return (
                    <tr key={t.id} className={idx ? "border-t border-white/10" : ""}>
                      <td className="p-3">{t.name}</td>
                      <td className="p-3">{t.code}</td>
                      <td className="p-3">{t.seatLimit ?? 0}</td>
                      <td className="p-3">
                        {t.licenseEndsAt ? new Date(t.licenseEndsAt).toLocaleString() : "-"}
                      </td>
                      <td className="p-3">
                        {remaining !== null ? `${remaining} days` : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 text-xs text-white/50">
          Note: “Active” means Now is between licenseStartsAt and licenseEndsAt.
        </div>
      </div>
    </div>
  );
}

function Card({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <div className="text-xs text-white/60">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
    </div>
  );
}