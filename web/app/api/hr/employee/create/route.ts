import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

function parseDate(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function emptyToNull(value: FormDataEntryValue | null) {
  const s = String(value ?? "").trim();
  return s ? s : null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userEmail = session?.user?.email;

  if (!userEmail) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();

    const user = await db.user.findUnique({
      where: { email: userEmail },
      select: {
        memberships: {
          where: { status: "ACTIVE" },
          orderBy: [{ createdAt: "desc" }],
          select: { tenantId: true },
        },
      },
    });

    const tenantId = user?.memberships?.[0]?.tenantId ?? null;
    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "No active tenant." },
        { status: 400 }
      );
    }

    const firstName = String(formData.get("firstName") ?? "").trim();
    const lastName = String(formData.get("lastName") ?? "").trim();
    const fullName = String(formData.get("fullName") ?? "").trim();
    const employmentType = String(formData.get("employmentType") ?? "").trim();

    if (!firstName || !lastName || !fullName || !employmentType) {
      return NextResponse.json(
        { ok: false, error: "Missing required fields." },
        { status: 400 }
      );
    }

    await db.employee.create({
      data: {
        tenantId,
        employeeNo: emptyToNull(formData.get("employeeNo")),
        firstName,
        lastName,
        fullName,
        gender: emptyToNull(formData.get("gender")) as any,
        birthDate: parseDate(formData.get("birthDate")),
        hireDate: parseDate(formData.get("hireDate")),
        exitDate: parseDate(formData.get("exitDate")),
        employmentType: employmentType as any,
        workerCategory: emptyToNull(formData.get("workerCategory")) as any,
        department: emptyToNull(formData.get("department")),
        position: emptyToNull(formData.get("position")),
        location: emptyToNull(formData.get("location")),
        nationalId: emptyToNull(formData.get("nationalId")),
        isActive: String(formData.get("isActive") ?? "true") === "true",
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("EMPLOYEE_CREATE_ERROR", error);
    return NextResponse.json(
      { ok: false, error: "Failed to create employee." },
      { status: 500 }
    );
  }
}