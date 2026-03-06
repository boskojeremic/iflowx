import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireSuperAdmin } from "@/lib/authz";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid body." }, { status: 400 });
    }

    const item = await db.reportGroup.update({
      where: { id },
      data: {
        code: String(body.code ?? "").toUpperCase().trim(),
        name: String(body.name ?? "").trim(),
        sortOrder: Number(body.sortOrder) || 100,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("REPORT_GROUP_PATCH_ERROR", error);
    return NextResponse.json(
      { error: "Internal server error while updating Report Group." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin();

    const { id } = await params;

    const reportsCount = await db.reportDefinition.count({
      where: { reportGroupId: id },
    });

    if (reportsCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete Report Group because it already contains Reports. Delete Reports first.",
        },
        { status: 400 }
      );
    }

    await db.reportGroup.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("REPORT_GROUP_DELETE_ERROR", error);
    return NextResponse.json(
      { error: "Internal server error while deleting Report Group." },
      { status: 500 }
    );
  }
}