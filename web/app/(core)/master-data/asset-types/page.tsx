import { db } from "@/lib/db";
import AssetTypesClient from "./AssetTypesClient";

export default async function AssetTypesPage() {
  const rows = await db.assetType.findMany({
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

  return <AssetTypesClient initialRows={rows} />;
}