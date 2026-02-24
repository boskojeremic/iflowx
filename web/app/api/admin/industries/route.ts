import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isSuperAdmin) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const industries = await db.industry.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, industries });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "FAILED" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.isSuperAdmin) {
      return NextResponse.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    const name = String(body?.name ?? "").trim();
    const code = String(body?.code ?? "").trim();

    if (!name) {
      return NextResponse.json({ ok: false, error: "NAME_REQUIRED" }, { status: 400 });
    }
    if (!code) {
      return NextResponse.json({ ok: false, error: "CODE_REQUIRED" }, { status: 400 });
    }

    const created = await db.industry.create({
      data: { name, code },
      select: { id: true, name: true, code: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, industry: created });
  } catch (e: any) {
    // Ako već postoji unique constraint na code ili name
    const msg = String(e?.message ?? "");
    if (msg.includes("Unique constraint")) {
      return NextResponse.json({ ok: false, error: "DUPLICATE" }, { status: 409 });
    }

    return NextResponse.json(
      { ok: false, error: e?.message ?? "FAILED" },
      { status: 500 }
    );
  }
}