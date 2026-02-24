import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = cookies();

  // obriši session cookie (prilagodi ime ako ti je drugačije)
  cookieStore.set("session", "", {
    path: "/",
    expires: new Date(0),
  });

  return NextResponse.json({ ok: true });
}