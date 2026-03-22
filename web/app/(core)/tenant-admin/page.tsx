import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

import TenantUsersPanel from "@/components/tenant-admin/TenantUsersPanel";
import ReportAssignmentsPanel from "@/components/tenant-admin/ReportAssignmentsPanel";
import OperationalFunctionPanel from "@/components/tenant-admin/OperationalFunctionPanel";

const tabs = [
  { key: "users", label: "Users" },
  { key: "roles", label: "Operational Functions" },
  { key: "report-assignments", label: "Report Assignments" },
] as const;

type SearchParams = Promise<{
  tab?: string;
  moduleId?: string;
  reportGroupId?: string;
}>;

export const dynamic = "force-dynamic";

export default async function TenantAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/login");

  const sp = await searchParams;
  const tab = sp?.tab ?? "users";

  const membership = await db.membership.findFirst({
    where: {
      user: {
        email: session.user.email,
      },
      status: "ACTIVE",
    },
    select: {
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!membership) {
    return <div className="p-6 text-red-400">No active tenant found.</div>;
  }

  const tenantId = membership.tenantId;

  const functions = await db.operationalFunction.findMany({
    where: {
      tenantId,
    },
    include: {
      _count: {
        select: {
          memberships: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });

  function buildTabHref(nextTab: string) {
    const qs = new URLSearchParams();

    qs.set("tab", nextTab);

    if (sp?.moduleId) qs.set("moduleId", sp.moduleId);
    if (sp?.reportGroupId) qs.set("reportGroupId", sp.reportGroupId);

    return `/tenant-admin?${qs.toString()}`;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tenant Admin</h1>
        <p className="mt-1 text-sm text-white/60">
          Tenant Governance, Roles, Report Assignments, And Technical Setup
        </p>
      </div>

      <div className="flex gap-2 flex-wrap">
        {tabs.map((t) => {
          const active = tab === t.key;

          return (
            <Link
              key={t.key}
              href={buildTabHref(t.key)}
              className={`px-4 py-2 rounded-md border text-sm font-medium transition ${
                active
                  ? "bg-blue-600 text-white border-blue-500"
                  : "bg-white/5 text-white border-white/10 hover:bg-white/10"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        {tab === "users" && <TenantUsersPanel />}
        {tab === "roles" && <OperationalFunctionPanel functions={functions} />}
        {tab === "report-assignments" && <ReportAssignmentsPanel />}
      </div>
    </div>
  );
}