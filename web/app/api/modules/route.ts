import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function toSlug(s: string) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const industryId = searchParams.get("industryId");

  const modules = await prisma.module.findMany({
    where: industryId ? { industryId } : undefined,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ modules });
}

export async function POST(req: Request) {
  const body = await req.json();

  if (!body?.industryId || !body?.name || !body?.code) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const industry = await prisma.industry.findUnique({
    where: { id: String(body.industryId) },
    select: { code: true },
  });

  if (!industry) {
    return NextResponse.json({ error: "Invalid industryId" }, { status: 400 });
  }

  const cleanName = String(body.name).trim();
  const cleanCode = String(body.code).trim();

  const routePathAuto = `/${toSlug(industry.code)}/${toSlug(cleanCode)}`;

  const moduleRow = await prisma.module.create({
    data: {
      industryId: String(body.industryId),
      name: cleanName,
      code: cleanCode,
      description: body.description ? String(body.description).trim() : null,
      routePath: routePathAuto,
      sortOrder: Number(body.sortOrder) || 0,
      isAddon: body.isAddon ?? true,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json(moduleRow);
}