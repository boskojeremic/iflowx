import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { redirect } from "next/navigation";
import AssetTypesClient from "./AssetTypesClient";

export default async function AssetTypesPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

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
      tenantId: true,
      tenant: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });

  if (!membership?.tenantId) {
    redirect("/home");
  }

  const rows = await db.assetType.findMany({
    where: {
      tenantId: membership.tenantId,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      sortOrder: true,
      isActive: true,
    },
  });

  return (
    <AssetTypesClient
      tenantName={membership.tenant.name}
      tenantCode={membership.tenant.code}
      initialRows={rows}
    />
  );
}