import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const industries = await prisma.industry.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ industries });
}

export async function POST(req: Request) {
  const body = await req.json();

  const industry = await prisma.industry.create({
    data: {
      name: String(body.name).trim().toUpperCase(),
      code: String(body.code).trim().toUpperCase(),
      sortOrder: Number(body.sortOrder) || 100,
    },
  });

  return NextResponse.json(industry);
}