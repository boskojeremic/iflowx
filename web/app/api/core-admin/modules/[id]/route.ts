import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function toSlug(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const body = await req.json();

  // Učitaj postojeći modul da možemo da izračunamo route ako treba
  const existing = await prisma.module.findUnique({
    where: { id },
    select: { id: true, industryId: true, code: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const nextIndustryId = body.industryId ? String(body.industryId) : existing.industryId;
  const nextCode = body.code != null ? String(body.code).trim() : existing.code;

  // Ako se menja industryId ili code (ili je poslato), regeneriši route
  let routePathAuto: string | undefined = undefined;

  const shouldRegenRoute = body.industryId != null || body.code != null;

  if (shouldRegenRoute) {
    const industry = await prisma.industry.findUnique({
      where: { id: nextIndustryId },
      select: { code: true },
    });

    if (!industry) {
      return NextResponse.json({ error: "Invalid industryId" }, { status: 400 });
    }

    routePathAuto = `/${toSlug(industry.code)}/${toSlug(nextCode)}`;
  }

  const updated = await prisma.module.update({
    where: { id },
    data: {
      ...(body.industryId ? { industryId: nextIndustryId } : {}),
      ...(body.name != null ? { name: String(body.name).trim() } : {}),
      ...(body.code != null ? { code: nextCode } : {}),
      ...(body.description !== undefined
        ? { description: body.description ? String(body.description).trim() : null }
        : {}),
      ...(routePathAuto !== undefined ? { routePath: routePathAuto } : {}),
      ...(body.sortOrder != null ? { sortOrder: Number(body.sortOrder) || 0 } : {}),
      ...(body.isAddon != null ? { isAddon: Boolean(body.isAddon) } : {}),
      ...(body.isActive != null ? { isActive: Boolean(body.isActive) } : {}),
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  await prisma.module.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}