import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: any) {
  const { pathname } = req.nextUrl;

  // Public rute (ne diramo)
  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/public");

  if (isPublic) return NextResponse.next();

  const token = await getToken({ req });

  // Ako nije ulogovan → uvek na /login
  if (!token?.email) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    // opcionalno: vrati ga posle login-a tamo gde je krenuo
    url.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Ulogovan → pusti dalje (license check ćemo kasnije server-side)
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.).*)"], // sve rute osim fajlova sa ekstenzijom
};