import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";
import { AssetTypeCategory } from "@prisma/client";

async function getCurrentTenantContext() {
  const user = await getCurrentUser();

  if (!user) {
    return {
      error: NextResponse.json({ error: "Not signed in." }, { status: 401 }),
    };
  }

  const membership = await db.membership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    orderBy: [
      { accessStartsAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      tenantId: true,
    },
  });

  if (!membership?.tenantId) {
    return {
      error: NextResponse.json(
        { error: "No active tenant found." },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    tenantId: membership.tenantId,
  };
}

function isAssetTypeCategory(value: string): value is AssetTypeCategory {
  return Object.values(AssetTypeCategory).includes(value as AssetTypeCategory);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getCurrentTenantContext();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const existing = await db.assetType.findFirst({
    where: {
      id,
      tenantId: auth.tenantId,
    },
    select: { id: true, tenantId: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Asset Type not found for current tenant." },
      { status: 404 }
    );
  }

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

  const duplicate = await db.assetType.findFirst({
    where: {
      tenantId: auth.tenantId,
      code,
      NOT: {
        id,
      },
    },
    select: { id: true },
  });

  if (duplicate) {
    return NextResponse.json(
      { error: "Another Asset Type with this Code already exists for current tenant." },
      { status: 409 }
    );
  }

  const row = await db.assetType.update({
    where: { id },
    data: {
      code,
      name,
      category: categoryRaw,
      sortOrder,
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

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getCurrentTenantContext();
  if ("error" in auth) return auth.error;

  const { id } = await params;

  const existing = await db.assetType.findFirst({
    where: {
      id,
      tenantId: auth.tenantId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Asset Type not found for current tenant." },
      { status: 404 }
    );
  }

  await db.assetType.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}