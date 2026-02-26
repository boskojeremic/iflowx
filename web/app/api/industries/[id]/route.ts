import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();

  const updated = await prisma.industry.update({
    where: { id },
    data: {
      ...(body.name != null ? { name: String(body.name).trim().toUpperCase() } : {}),
      ...(body.code != null ? { code: String(body.code).trim().toUpperCase() } : {}),
      ...(body.sortOrder != null ? { sortOrder: Number(body.sortOrder) || 100 } : {}),
      ...(body.isActive != null ? { isActive: Boolean(body.isActive) } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.industry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}