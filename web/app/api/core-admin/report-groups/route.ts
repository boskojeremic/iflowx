import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/authz";

export async function GET(req: Request) {
  await requireSuperAdmin();

  const { searchParams } = new URL(req.url);
  const moduleId = searchParams.get("moduleId");
  const tenantId = searchParams.get("tenantId");

  if (!moduleId || !tenantId) {
    return NextResponse.json({ reportGroups: [] });
  }

  const reportGroups = await db.reportGroup.findMany({
    where: {
      tenantId,
      moduleId,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ reportGroups });
}

export async function POST(req: Request) {
  await requireSuperAdmin();

  const body = await req.json();

  if (!body?.tenantId || !body?.moduleId) {
    return NextResponse.json(
      { error: "TENANT_ID_AND_MODULE_ID_REQUIRED" },
      { status: 400 }
    );
  }

  const item = await db.reportGroup.create({
    data: {
      id: crypto.randomUUID(),
      tenantId: body.tenantId,
      moduleId: body.moduleId,
      code: body.code,
      name: body.name,
      sortOrder: Number(body.sortOrder) || 100,
      isActive: true,
    },
  });

  return NextResponse.json(item);
}