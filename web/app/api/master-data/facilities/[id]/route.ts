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
    return NextResponse.json(
      { error: "No active tenant context." },
      { status: 400 }
    );
  }

  if (!(membership.role === "OWNER" || membership.role === "ADMIN")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.facility.findFirst({
    where: {
      id,
      tenantId: membership.tenantId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const siteId = String(body.siteId ?? "").trim();
  const code = String(body.code ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim().toUpperCase();

  if (!siteId || !code || !name) {
    return NextResponse.json(
      { error: "Site, Code, and Name are required." },
      { status: 400 }
    );
  }

  const site = await db.site.findFirst({
    where: {
      id: siteId,
      tenantId: membership.tenantId,
    },
    select: { id: true },
  });

  if (!site) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const row = await db.facility.update({
    where: {
      id,
    },
    data: {
      siteId,
      code,
      name,
    },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
      siteId: true,
      Site: {
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
    return NextResponse.json(
      { error: "No active tenant context." },
      { status: 400 }
    );
  }

  if (!(membership.role === "OWNER" || membership.role === "ADMIN")) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  const { id } = await params;

  const existing = await db.facility.findFirst({
    where: {
      id,
      tenantId: membership.tenantId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Facility not found." }, { status: 404 });
  }

  await db.facility.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({ ok: true });
}