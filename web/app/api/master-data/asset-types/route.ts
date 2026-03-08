import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { AssetTypeCategory } from "@prisma/client";

async function ensureUser() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }

  return { user };
}

function isAssetTypeCategory(value: string): value is AssetTypeCategory {
  return Object.values(AssetTypeCategory).includes(value as AssetTypeCategory);
}

export async function GET() {
  const auth = await ensureUser();
  if ("error" in auth) return auth.error;

  const rows = await db.assetType.findMany({
    orderBy: [{ sortOrder: "asc" }, { code: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
      sortOrder: true,
      isActive: true,
    },
  });

  return NextResponse.json({ rows });
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
  const categoryRaw = String(body.category ?? "").trim().toUpperCase();
  const sortOrder = Number(body.sortOrder ?? 100) || 0;

  if (!code || !name || !categoryRaw) {
    return NextResponse.json(
      { error: "Code, Name, and Category are required." },
      { status: 400 }
    );
  }

  if (!isAssetTypeCategory(categoryRaw)) {
    return NextResponse.json(
      { error: "Invalid Category value." },
      { status: 400 }
    );
  }

  const exists = await db.assetType.findUnique({
    where: { code },
    select: { id: true },
  });

  if (exists) {
    return NextResponse.json(
      { error: "Asset Type with this Code already exists." },
      { status: 409 }
    );
  }

  const row = await db.assetType.create({
    data: {
      code,
      name,
      category: categoryRaw,
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

  return NextResponse.json({ ok: true, row }, { status: 201 });
}