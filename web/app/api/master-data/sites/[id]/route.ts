import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/authz";

async function getActiveTenantContext(userId: string) {
  const membership = await db.membership.findFirst({
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

  return membership;
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

  const existing = await db.site.findFirst({
    where: {
      id,
      tenantId: membership.tenantId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  const body = await req.json().catch(() => null);

  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const code = String(body.code ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim().toUpperCase();
  const country = String(body.country ?? "").trim().toUpperCase();
  const city = String(body.city ?? "").trim().toUpperCase() || null;
  const location = String(body.location ?? "").trim().toUpperCase() || null;

  if (!code || !name || !country) {
    return NextResponse.json(
      { error: "Code, Name, and Country are required." },
      { status: 400 }
    );
  }

  const row = await db.site.update({
    where: {
      id,
    },
    data: {
      code,
      name,
      country,
      city,
      location,
    },
    select: {
      id: true,
      code: true,
      name: true,
      country: true,
      city: true,
      location: true,
      isActive: true,
    },
  });

  return NextResponse.json({
    ok: true,
    row,
  });
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

  const existing = await db.site.findFirst({
    where: {
      id,
      tenantId: membership.tenantId,
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Site not found." }, { status: 404 });
  }

  await db.site.delete({
    where: {
      id,
    },
  });

  return NextResponse.json({
    ok: true,
  });
}