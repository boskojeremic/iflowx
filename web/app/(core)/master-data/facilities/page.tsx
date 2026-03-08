import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import FacilitiesClient from "./FacilitiesClient";

export default async function FacilitiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const membership = await db.membership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    orderBy: [
      { accessStartsAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  if (!membership?.tenant) {
    return (
      <div className="space-y-5">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Facilities</h1>
          <p className="text-sm text-white/60">No Active Tenant Context Found</p>
        </div>
      </div>
    );
  }

  const [sites, rows] = await Promise.all([
    db.site.findMany({
      where: { tenantId: membership.tenant.id },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
      },
    }),
    db.facility.findMany({
      where: { tenantId: membership.tenant.id },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        isActive: true,
        siteId: true,
        Site: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    }),
  ]);

  return (
    <FacilitiesClient
      tenantId={membership.tenant.id}
      tenantName={membership.tenant.name}
      tenantCode={membership.tenant.code}
      sites={sites}
      initialRows={rows}
    />
  );
}