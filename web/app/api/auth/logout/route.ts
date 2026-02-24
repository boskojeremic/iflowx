// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  // Ako ti NextAuth koristi ove cookies, obriši ih:
  // (ne smeta i ako neki ne postoje)
  const names = [
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
    "__Host-next-auth.csrf-token",
    "next-auth.csrf-token",
    "next-auth.callback-url",
  ];

  for (const name of names) {
    cookieStore.set(name, "", { path: "/", expires: new Date(0) });
  }

  return NextResponse.json({ ok: true });
}