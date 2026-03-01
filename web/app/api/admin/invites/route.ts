import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { generateInviteToken, hashToken } from "@/lib/inviteToken";
import { requireAdmin } from "@/lib/rbac";
import { sendInviteEmail } from "@/lib/email";
import { getBaseUrl } from "@/lib/url";

export const runtime = "nodejs";

type ValidityUnit = "DAYS" | "MONTHS" | "YEARS";

function clampInt(v: unknown, min: number, max: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  const i = Math.trunc(n);
  if (i < min || i > max) return null;
  return i;
}

function addMonthsSafe(d: Date, months: number) {
  const x = new Date(d);
  const day = x.getDate();
  x.setMonth(x.getMonth() + months);
  if (x.getDate() < day) x.setDate(0);
  return x;
}

function addYearsSafe(d: Date, years: number) {
  const x = new Date(d);
  const m = x.getMonth();
  x.setFullYear(x.getFullYear() + years);
  if (x.getMonth() !== m) x.setDate(0);
  return x;
}

function computeExpiresAt(now: Date, validity: { amount: number; unit: ValidityUnit }) {
  const { amount, unit } = validity;
  if (unit === "DAYS") return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
  if (unit === "MONTHS") return addMonthsSafe(now, amount);
  return addYearsSafe(now, amount);
}

function minDate(dates: Date[]) {
  return new Date(Math.min(...dates.map((d) => d.getTime())));
}

function maxDate(dates: Date[]) {
  return new Date(Math.max(...dates.map((d) => d.getTime())));
}

export async function POST(req: Request) {
  console.log("[INVITES] ROUTE_HIT");

  try {
    const session = (await getServerSession(authOptions as any)) as any;
    console.log("[INVITES] session user:", session?.user?.email ?? null);

    if (!session?.user?.email) {
      return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
    }

    const me = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, email: true, isSuperAdmin: true },
    });

    console.log("[INVITES] me:", me);

    if (!me) {
      return NextResponse.json({ ok: false, error: "UNAUTH" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const tenantId = String(body.tenantId || "").trim();
    const email = String(body.email || "").trim().toLowerCase();

    // Core Admin flow: always ADMIN
    const role = "ADMIN";

    console.log("[INVITES] payload:", { tenantId, email, role });

    if (!tenantId || !email) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    // Permission
    const okAdmin = me.isSuperAdmin ? true : await requireAdmin(tenantId, me.id);
    console.log("[INVITES] okAdmin:", okAdmin);

    if (!okAdmin) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    // Tenant basic info (no tenant-level license anymore)
    const tenant = await db.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, name: true, code: true },
    });

    if (!tenant) {
      return NextResponse.json({ ok: false, error: "TENANT_NOT_FOUND" }, { status: 404 });
    }

    // ✅ Guard: first admin invite allowed only after TenantModule licenses are configured
    const existingAdmins = await db.membership.count({
      where: { tenantId, role: { in: ["OWNER", "ADMIN"] } },
    });

    if (existingAdmins === 0) {
      const activeTmCount = await db.tenantModule.count({
        where: { tenantId, status: "ACTIVE" },
      });
      if (activeTmCount === 0) {
        return NextResponse.json(
          { ok: false, error: "TENANT_HAS_NO_LICENSED_MODULES" },
          { status: 400 }
        );
      }
    }

    // ✅ Compute membership access window from ACTIVE TenantModules
    const tms = await db.tenantModule.findMany({
      where: { tenantId, status: "ACTIVE" },
      select: { startsAt: true, endsAt: true },
    });

    if (tms.length === 0) {
      return NextResponse.json(
        { ok: false, error: "TENANT_HAS_NO_LICENSED_MODULES" },
        { status: 400 }
      );
    }

    const starts = tms.map((x) => x.startsAt).filter((d): d is Date => !!d);
    const ends = tms.map((x) => x.endsAt).filter((d): d is Date => !!d);

    // access starts: min startsAt, or now if none set
    const accessStartsAt = starts.length ? minDate(starts) : new Date();

    // access ends: max endsAt, or null if no endsAt set on any module
    const accessEndsAt = ends.length ? maxDate(ends) : null;

// ❗ require at least one module with defined end date
if (!accessEndsAt) {
  return NextResponse.json(
    { ok: false, error: "NO_MODULE_LICENSE_END_DEFINED" },
    { status: 400 }
  );
}
    // Invite link validity (default 7 days)
    const rawAmount = clampInt(body?.validity?.amount, 1, 3650);
    const rawUnit = String(body?.validity?.unit || "").toUpperCase();
    const unitOk = rawUnit === "DAYS" || rawUnit === "MONTHS" || rawUnit === "YEARS";

    const amount = rawAmount ?? 7;
    const unit = (unitOk ? rawUnit : "DAYS") as ValidityUnit;

    const now = new Date();
    const expiresAt = computeExpiresAt(now, { amount, unit });

    console.log("[INVITES] link validity/expiresAt:", {
      amount,
      unit,
      expiresAt: expiresAt.toISOString(),
    });

    // STEP 1: ensure user exists
    const invitedUser = await db.user.upsert({
      where: { email },
      update: {},
      create: { email },
      select: { id: true, email: true },
    });

    // STEP 2: membership INVITED admin (track who assigned)
await db.membership.upsert({
  where: { tenantId_userId: { tenantId, userId: invitedUser.id } },
  update: {
    role: "ADMIN",
    status: "INVITED",
    createdByUserId: me.id,
  },
  create: {
    tenantId,
    userId: invitedUser.id,
    role: "ADMIN",
    status: "INVITED",
    createdByUserId: me.id,
  },
  select: { id: true },
});

    // STEP 3: create invite token + record (invite expiry is link expiry)
    const token = generateInviteToken();
    const tokenHash = hashToken(token);

    console.log("[INVITES_CREATE] token:", token);
    console.log("[INVITES_CREATE] tokenHash:", tokenHash);

    const invite = await db.invite.create({
      data: {
        tenantId,
        email,
        role: role as any,
        tokenHash,
        expiresAt,
      },
      select: { id: true, createdAt: true, expiresAt: true },
    });

    console.log("[INVITES] invite created:", invite.id);

    const baseUrl = await getBaseUrl();
const inviteUrl = `${baseUrl}/invite/${token}`;
if (typeof inviteUrl !== "string" || inviteUrl.includes("[object Promise]")) {
  return NextResponse.json({ ok: false, error: "BAD_INVITE_URL" }, { status: 500 });
}
    console.log("[INVITES] baseUrl/inviteUrl:", { baseUrl, inviteUrl });

    let emailed = false;
    let emailError: string | null = null;

    try {
      console.log("[INVITES] SENDING_EMAIL", {
        to: email,
        tenantId,
        tenantName: tenant?.name ?? null,
        role,
        hasResendKey: !!process.env.RESEND_API_KEY,
      });

      // ✅ EMAIL: show tenant access window (from modules), not invite expiry
      await sendInviteEmail({
        to: email,
        inviteUrl,
        tenantName: tenant.name ?? "IFlowX",
        tenantCode: tenant.code ?? undefined,
        role,
        productName: "IFlowX",
        licenseStart: accessStartsAt,
        licenseEnd: accessEndsAt,
        issuedTo: email,
        issuedBy: "IFlowX Super Admin",
      });

      emailed = true;
      console.log("[INVITES] EMAIL_SENT_OK");
    } catch (e: any) {
      emailError = e?.message ?? String(e);
      console.error("[INVITES] INVITE_EMAIL_FAILED:", e);
    }

    return NextResponse.json({
      ok: true,
      inviteUrl,
      expiresAt, // link expiry
      emailed,
      emailError,
      ensuredUser: true,
      ensuredMembership: true,
      accessStartsAt,
      accessEndsAt,
    });
  } catch (e: any) {
    console.error("[INVITES] FATAL:", e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}