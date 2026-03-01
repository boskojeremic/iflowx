import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function requireSA() {
  const me = await getCurrentUser();
  if (!me || !me.isSuperAdmin) return null;
  return me;
}

export async function GET() {
  const me = await requireSA();
  if (!me) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, isSuperAdmin: true, createdAt: true },
  });

  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  const me = await requireSA();
  if (!me) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  const name = body.name === null ? null : String(body.name || "").trim() || null;

  if (!email) return NextResponse.json({ error: "EMAIL_REQUIRED" }, { status: 400 });

  try {
    const user = await db.user.create({
      data: { email, name },
      select: { id: true, email: true, name: true, isSuperAdmin: true, createdAt: true },
    });
    return NextResponse.json({ user });
  } catch (e: any) {
    return NextResponse.json(
      { error: "CREATE_FAILED", code: e?.code ?? null, message: String(e?.message ?? e) },
      { status: 500 }
    );
  }
}