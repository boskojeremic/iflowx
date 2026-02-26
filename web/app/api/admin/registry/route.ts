import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

async function requireSuperAdmin() {
  const session = (await getServerSession(authOptions as any)) as any;
  const email = session?.user?.email;
  if (!email) return null;

  const me = await db.user.findUnique({
    where: { email: String(email) },
    select: { id: true, isSuperAdmin: true },
  });

  if (!me?.isSuperAdmin) return null;
  return me;
}

export async function GET() {
  const me = await requireSuperAdmin();
  if (!me) return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });

  const industries = await db.industry.findMany({
    where: { isActive: true },
    orderBy: { code: "asc" },
    include: {
      modules: {
        where: { isActive: true },
        orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
          routePath: true,
          isAddon: true,
          sortOrder: true,
          industryId: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, industries });
}