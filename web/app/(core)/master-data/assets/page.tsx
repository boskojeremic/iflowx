import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import AssetsClient from "./AssetsClient";

export default async function AssetsPage() {
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
          <h1 className="text-2xl font-semibold tracking-tight">Assets</h1>
          <p className="text-sm text-white/60">No Active Tenant Context Found</p>
        </div>
      </div>
    );
  }

  const tenantId = membership.tenant.id;

  const [facilities, assetTypes, rows] = await Promise.all([
    db.facility.findMany({
      where: { tenantId },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        Site: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    }),
    db.assetType.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
      },
    }),
    db.asset.findMany({
      where: { tenantId },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        code: true,
        name: true,
        location: true,
        assetRole: true,
        facilityId: true,
        assetTypeId: true,
        parentAssetId: true,
        Facility: {
          select: {
            id: true,
            code: true,
            name: true,
            Site: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        AssetType: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
          },
        },
        parentAsset: {
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
    <AssetsClient
      tenantId={tenantId}
      tenantName={membership.tenant.name}
      tenantCode={membership.tenant.code}
      facilities={facilities}
      assetTypes={assetTypes}
      initialRows={rows}
    />
  );
}