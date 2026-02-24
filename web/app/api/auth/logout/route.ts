import { NextResponse } from "next/server";

export const runtime = "nodejs";

function killCookie(res: NextResponse, name: string) {
  // maxAge: 0 + expires u prošlosti + path "/"
  res.cookies.set({
    name,
    value: "",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    // secure/sameSite se ne moraju poklopiti 1:1 za brisanje,
    // ali ne smeta da ih ostavimo “sigurno”
    secure: true,
    sameSite: "lax",
  });
}

export async function POST() {
  const res = NextResponse.json({ ok: true });

  // SESSION (prod + dev)
  killCookie(res, "__Secure-next-auth.session-token");
  killCookie(res, "next-auth.session-token");

  // CSRF
  killCookie(res, "__Host-next-auth.csrf-token");
  killCookie(res, "__Secure-next-auth.csrf-token");
  killCookie(res, "next-auth.csrf-token");

  // CALLBACK
  killCookie(res, "__Secure-next-auth.callback-url");
  killCookie(res, "next-auth.callback-url");

  return res;
}