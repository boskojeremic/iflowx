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
  if (x.getDate() < day) x.setDate(0); // clamp end-of-month
  return x;
}

function addYearsSafe(d: Date, years: number) {
  const x = new Date(d);
  const m = x.getMonth();
  x.setFullYear(x.getFullYear() + years);
  if (x.getMonth() !== m) x.setDate(0); // Feb 29 rollover
  return x;
}

function computeExpiresAt(now: Date, validity: { amount: number; unit: ValidityUnit }) {
  const { amount, unit } = validity;
  if (unit === "DAYS") return new Date(now.getTime() + amount * 24 * 60 * 60 * 1000);
  if (unit === "MONTHS") return addMonthsSafe(now, amount);
  return addYearsSafe(now, amount);
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

    const body = await req.json();

    const tenantId = String(body.tenantId || "");
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "VIEWER");

    console.log("[INVITES] payload:", { tenantId, email, role });

    if (!tenantId || !email) {
      return NextResponse.json({ ok: false, error: "BAD_REQUEST" }, { status: 400 });
    }

    const okAdmin = me.isSuperAdmin ? true : await requireAdmin(tenantId, me.id);
    console.log("[INVITES] okAdmin:", okAdmin);

    if (!okAdmin) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    // ✅ validity: accept { validity: { amount, unit } } OR fallback to 7 days
    const rawAmount = clampInt(body?.validity?.amount, 1, 3650);
    const rawUnit = String(body?.validity?.unit || "").toUpperCase();
    const unitOk = rawUnit === "DAYS" || rawUnit === "MONTHS" || rawUnit === "YEARS";

    const amount = rawAmount ?? 7;
    const unit = (unitOk ? rawUnit : "DAYS") as ValidityUnit;

    const now = new Date();
    const expiresAt = computeExpiresAt(now, { amount, unit });

    console.log("[INVITES] validity/expiresAt:", { amount, unit, expiresAt: expiresAt.toISOString() });

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

    const baseUrl = "https://app.dig-ops.com"; // production domain
const inviteUrl = `${baseUrl}/invite/${token}`;


    let emailed = false;
    let emailError: string | null = null;

    // ✅ email block try/catch (only for email)
    try {
      const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, code: true },
      });

      console.log("[INVITES] SENDING_EMAIL", {
        to: email,
        tenantId,
        tenantName: tenant?.name ?? null,
        role,
        hasResendKey: !!process.env.RESEND_API_KEY,
      });

      await sendInviteEmail({
        to: email,
        inviteUrl,
        tenantName: tenant?.name ?? "IFlowX",
        tenantCode: tenant?.code ?? undefined,
        role,
        productName: "IFlowX",
        licenseStart: invite.createdAt,
        licenseEnd: invite.expiresAt,
        issuedTo: email,
        issuedBy: "IFlowX Admin",
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
      expiresAt,
      emailed,
      emailError,
    });
  } catch (e: any) {
    console.error("[INVITES] FATAL:", e);
    return NextResponse.json(
      { ok: false, error: "SERVER_ERROR", details: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
