import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/authz";

export async function GET(req: Request) {
  await requireSuperAdmin();

  const { searchParams } = new URL(req.url);
  const reportGroupId = searchParams.get("reportGroupId");

  if (!reportGroupId) {
    return NextResponse.json({ reports: [] });
  }

  const reports = await db.reportDefinition.findMany({
    where: { reportGroupId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ reports });
}

export async function POST(req: Request) {
  await requireSuperAdmin();

  const body = await req.json();

  const reportGroup = await db.reportGroup.findUnique({
  where: { id: body.reportGroupId },
  select: { id: true, moduleId: true },
});

if (!reportGroup) {
  return Response.json({ error: "Invalid reportGroupId" }, { status: 400 });
}

const item = await db.reportDefinition.create({
  data: {
    id: crypto.randomUUID(),
    reportGroupId: reportGroup.id,
    code: body.code,
    name: body.name,
    description: body.description ?? null,
    sortOrder: Number(body.sortOrder ?? 0),
    isActive: true,
  },
});

  return NextResponse.json(item);
}