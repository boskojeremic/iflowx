import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const industries = await prisma.industry.findMany({
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ industries });
}

export async function POST(req: Request) {
  const body = await req.json();

  const industry = await prisma.industry.create({
    data: {
      name: body.name,
      code: body.code,
    },
  });

  return NextResponse.json(industry);
}