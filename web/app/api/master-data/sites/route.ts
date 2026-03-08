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
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  });

  return membership;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const membership = await getActiveTenantContext(user.id);
  if (!membership?.tenantId) {
    return NextResponse.json({ error: "No active tenant context." }, { status: 400 });
  }

  const rows = await db.site.findMany({
    where: {
      tenantId: membership.tenantId,
    },
    orderBy: [{ name: "asc" }],
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

  return NextResponse.json({ rows });
}

export async function POST(req: Request) {
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

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }

  const code = String(body.code ?? "").trim().toUpperCase();
  const name = String(body.name ?? "").trim();
  const country = String(body.country ?? "").trim();
  const city = String(body.city ?? "").trim() || null;
  const location = String(body.location ?? "").trim() || null;

  if (!code || !name || !country) {
    return NextResponse.json(
      { error: "Code, Name, and Country are required." },
      { status: 400 }
    );
  }

  const row = await db.site.create({
    data: {
      tenantId: membership.tenantId,
      code,
      name,
      country,
      city,
      location,
      isActive: true,
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

  return NextResponse.json({ ok: true, row });
}