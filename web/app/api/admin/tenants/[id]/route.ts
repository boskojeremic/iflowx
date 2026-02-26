import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/authz";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  const body = await req.json().catch(() => ({}));

  const data: any = {};

  if (body.name !== undefined) data.name = String(body.name ?? "").trim().toUpperCase();
  if (body.code !== undefined) data.code = String(body.code ?? "").trim().toUpperCase();
  if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

  if (body.licenseStartsAt !== undefined) {
    data.licenseStartsAt = body.licenseStartsAt ? new Date(body.licenseStartsAt) : null;
  }
  if (body.licenseEndsAt !== undefined) {
    data.licenseEndsAt = body.licenseEndsAt ? new Date(body.licenseEndsAt) : null;
  }

  const tenant = await prisma.tenant.update({
    where: { id },
    data,
    select: {
      id: true,
      name: true,
      code: true,
      isActive: true,
      licenseStartsAt: true,
      licenseEndsAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, tenant });
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  await requireSuperAdmin();

  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });

  await prisma.tenant.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}