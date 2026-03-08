import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";

async function getActiveTenantContext(userId: string) {
  return db.membership.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    orderBy: [
      { accessStartsAt: { sort: "desc", nulls: "last" } },
      { createdAt: "desc" },
    ],
    select: {
      tenantId: true,
      role: true,
    },
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const membership = await getActiveTenantContext(user.id);

  if (!membership?.tenantId) {
    return NextResponse.json({ error: "No active tenant context." }, { status: 400 });
  }

  if (!(membership.role === "OWNER" || membership.role === "ADMIN")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.asset.findFirst({
    where: {
      id,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const facilityId = String(body.facilityId ?? "").trim();
  const assetTypeId = String(body.assetTypeId ?? "").trim();
  const parentAssetId = String(body.parentAssetId ?? "").trim() || null;
  const assetRole = String(body.assetRole ?? "").trim().toUpperCase();
  const code = String(body.code ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim().toUpperCase();
  const location = String(body.location ?? "").trim().toUpperCase() || null;

  if (!facilityId || !assetTypeId || !assetRole || !code || !name) {
    return NextResponse.json(
      { error: "Facility, Asset Type, Asset Role, Code, and Name are required." },
      { status: 400 }
    );
  }

  const facility = await db.facility.findFirst({
    where: {
      id: facilityId,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!facility) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  const assetType = await db.assetType.findUnique({
    where: { id: assetTypeId },
    select: { id: true },
  });

  if (!assetType) {
    return NextResponse.json({ error: "Asset Type not found." }, { status: 404 });
  }

  if (parentAssetId) {
    if (parentAssetId === id) {
      return NextResponse.json(
        { error: "Asset cannot be its own parent." },
        { status: 400 }
      );
    }

    const parent = await db.asset.findFirst({
      where: {
        id: parentAssetId,
        tenantId: membership.tenantId,
      },
      select: { id: true },
    });

    if (!parent) {
      return NextResponse.json({ error: "Parent Asset not found." }, { status: 404 });
    }
  }

  const row = await db.asset.update({
    where: { id },
    data: {
      facilityId,
      assetTypeId,
      parentAssetId,
      assetRole: assetRole as any,
      code,
      name,
      location,
    },
    select: {
      id: true,
      code: true,
      name: true,
      location: true,
      assetRole: true,
      facilityId: true,
      assetTypeId: true,
      parentAssetId: true,
      Facility: {
        select: {
          id: true,
          code: true,
          name: true,
          Site: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },
      },
      AssetType: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
        },
      },
      parentAsset: {
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ ok: true, row });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const membership = await getActiveTenantContext(user.id);

  if (!membership?.tenantId) {
    return NextResponse.json({ error: "No active tenant context." }, { status: 400 });
  }

  if (!(membership.role === "OWNER" || membership.role === "ADMIN")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.asset.findFirst({
    where: {
      id,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }

  await db.asset.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}