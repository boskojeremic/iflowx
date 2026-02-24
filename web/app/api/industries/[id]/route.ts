import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: { id: string } | Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  try {
    const { id } = await Promise.resolve(ctx.params);

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const code = String(body?.code ?? "").trim();

    if (!name || !code) {
      return NextResponse.json(
        { ok: false, error: "Missing name or code" },
        { status: 400 }
      );
    }

    const updated = await prisma.industry.update({
      where: { id },
      data: { name, code },
    });

    return NextResponse.json({ ok: true, industry: updated });
  } catch (e: any) {
    const msg =
      e?.code === "P2002" ? "Code must be unique." : e?.message ?? "Update failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 400 });
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  try {
    const { id } = await Promise.resolve(ctx.params);

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing id" }, { status: 400 });
    }

    await prisma.industry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Delete failed" },
      { status: 500 }
    );
  }
}