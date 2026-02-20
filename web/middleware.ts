import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: any) {
  const { pathname } = req.nextUrl;

  // ✅ uvek pusti login i nextauth rute (sprečava loop)
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET,
  });

  if (!token?.email) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};