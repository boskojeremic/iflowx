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

    const body = await req.json();

    const detailId = String(body?.detailId || "").trim();
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
      const parsed = Number(valueRaw);
      if (Number.isFinite(parsed)) {
        mpValueFloat = parsed;
      } else {
        mpValueText = String(valueRaw);
      }
    }

    await db.measurementSnapshotDetail.update({
      where: { id: detailId },
      data: {
        mpValueFloat,
        mpValueInt,
        mpValueText,
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