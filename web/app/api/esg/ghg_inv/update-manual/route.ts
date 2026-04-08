import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, error: "Unauthorized." },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user?.id) {
      return NextResponse.json(
        { ok: false, error: "User not found." },
        { status: 401 }
      );
    }

    const body = await req.json();

    const detailId = String(body?.detailId ?? "").trim();
    const valueRaw = body?.value;

    if (!detailId) {
      return NextResponse.json(
        { ok: false, error: "detailId is required." },
        { status: 400 }
      );
    }

    let mpValueFloat: number | null = null;
    let mpValueInt: number | null = null;
    let mpValueText: string | null = null;

    if (valueRaw === "" || valueRaw === null || valueRaw === undefined) {
      mpValueFloat = 0;
    } else {
      const normalized =
        typeof valueRaw === "string" ? valueRaw.trim().replace(",", ".") : valueRaw;

      const parsed = Number(normalized);

      if (Number.isFinite(parsed)) {
        mpValueFloat = parsed;
        mpValueInt = null;
        mpValueText = null;
      } else {
        mpValueFloat = null;
        mpValueInt = null;
        mpValueText = String(valueRaw).trim();
      }
    }

    await db.measurementSnapshotDetail.update({
      where: { id: detailId },
      data: {
        mpValueFloat,
        mpValueInt,
        mpValueText,
        updatedBy: user.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("UPDATE MANUAL ERROR:", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to update manual value.",
      },
      { status: 500 }
    );
  }
}