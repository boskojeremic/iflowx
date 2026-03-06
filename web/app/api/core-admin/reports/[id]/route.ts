import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperAdmin();

  const { id } = await params;
  const body = await req.json();

  const item = await db.reportDefinition.update({
    where: { id },
    data: {
      code: body.code,
      name: body.name,
      description: body.description ?? null,
      sortOrder: Number(body.sortOrder) || 100,
    },
  });

  return NextResponse.json(item);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireSuperAdmin();

  const { id } = await params;

  await db.reportDefinition.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}