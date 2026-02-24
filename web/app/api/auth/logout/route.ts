import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export const runtime = "nodejs";

export async function POST() {
  const c = await cookies();

  // session token (dev + prod)
  c.delete("next-auth.session-token");
  c.delete("__Secure-next-auth.session-token");

  // csrf (dev + prod)
  c.delete("next-auth.csrf-token");
  c.delete("__Host-next-auth.csrf-token");
  c.delete("__Secure-next-auth.csrf-token");

  // callback url (dev + prod)
  c.delete("next-auth.callback-url");
  c.delete("__Secure-next-auth.callback-url");

  return NextResponse.json({ ok: true });
}