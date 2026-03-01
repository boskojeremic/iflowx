import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/authz";
import { db } from "@/lib/db";
import { checkUserLicense } from "@/lib/license";

export default async function HomePage() {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");

  // ✅ bitno: ucitaj user iz DB da dobijes isSuperAdmin sigurno
  const me = await db.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, email: true, name: true, isSuperAdmin: true },
  });
  if (!me) redirect("/login");

  const membership = await db.membership.findFirst({
    where: { userId: me.id, status: "ACTIVE" },
    orderBy: [
      { accessStartsAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      role: true,
      tenant: { select: { id: true, name: true, code: true } },
    },
  });

  const lic = me.isSuperAdmin ? { active: true } : await checkUserLicense(me.email);

  const tenantText = me.isSuperAdmin
    ? "DIGITALOPS CONSULTING"
    : membership?.tenant
      ? `${membership.tenant.name} (${membership.tenant.code})`
      : "Not assigned";

  const roleText = me.isSuperAdmin ? "CORE ADMIN" : membership?.role ?? "N/A";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Overview of your account and tenant access.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] shadow-sm">
        <div className="border-b border-white/10 px-5 py-4">
          <div className="text-sm font-semibold text-white/90">License Status</div>
          <div className="text-xs text-white/50">User / Tenant / Role</div>
        </div>

        <div className="px-5 py-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="text-white/60">User</div>
            <div className="text-white/90 text-right">{me.name ?? "-"}</div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-white/60">Email</div>
            <div className="text-white/90 text-right">{me.email}</div>
          </div>

          <div className="h-px bg-white/10" />

          <div className="flex items-center justify-between gap-4">
            <div className="text-white/60">Tenant</div>
            <div className="text-white/90 text-right">{tenantText}</div>
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="text-white/60">Role</div>
            <div className="text-white/90 text-right">{roleText}</div>
          </div>

          {/* ✅ ODVOJEN RED (da ne upada u Role) */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-white/60">License Status</div>
            <div className={`text-right font-medium ${lic?.active ? "text-emerald-400" : "text-red-400"}`}>
              {lic?.active ? "ACTIVE" : "INACTIVE"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}