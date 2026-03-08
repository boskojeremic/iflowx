import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";

async function ensureUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }

  return { user };
}

export async function POST(req: Request) {
  const auth = await ensureUser();
  if ("error" in auth) return auth.error;

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const code = String(body.code ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim().toUpperCase();
  const category = String(body.category ?? "").trim().toUpperCase();
  const sortOrder = Number(body.sortOrder ?? 100) || 0;

  if (!code || !name || !category) {
    return NextResponse.json(
      { error: "Code, Name, and Category are required." },
      { status: 400 }
    );
  }

  const row = await db.assetType.create({
    data: {
      code,
      name,
      category,
      sortOrder,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      sortOrder: true,
      isActive: true,
    },
  });

  return NextResponse.json({ ok: true, row });
}