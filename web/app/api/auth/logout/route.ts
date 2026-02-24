import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  const cookieStore = await cookies();

  const names = [
    // session
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "__Host-next-auth.session-token",

    // csrf (nije obavezno, ali čisti sve)
    "next-auth.csrf-token",
    "__Secure-next-auth.csrf-token",
    "__Host-next-auth.csrf-token",

    // callback
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "__Host-next-auth.callback-url",
  ];

  for (const name of names) {
    cookieStore.set(name, "", {
      path: "/",
      expires: new Date(0),
    });
  }

  return NextResponse.json({ ok: true });
}