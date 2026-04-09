import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: any) {
  const { pathname, search } = req.nextUrl;

  const pdfMode = req.nextUrl.searchParams.get("pdf");
  const pdfKey = req.nextUrl.searchParams.get("key");

  const isInternalFopPdfPreview =
    pathname.startsWith("/pdf/fop-preview") &&
    pdfMode === "1" &&
    pdfKey &&
    pdfKey === process.env.PDF_INTERNAL_SECRET;

  const isInternalGhgPdfPreview =
    pathname.startsWith("/ghg_inv-preview") &&
    pdfMode === "1" &&
    pdfKey &&
    pdfKey === process.env.PDF_INTERNAL_SECRET;

  if (
    isInternalFopPdfPreview ||
    isInternalGhgPdfPreview ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/invite") ||
    pathname.startsWith("/api/invites") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/fop") ||
    pathname.startsWith("/api/esg/ghg_inv") ||
    pathname.startsWith("/ogi/fop/approve") ||
    pathname.startsWith("/gen/esg/ghg_inv/approve") ||
    pathname.startsWith("/fop-preview") ||
    pathname.startsWith("/ghg_inv-preview") ||
    pathname.startsWith("/pdf/fop-preview") ||
    pathname.startsWith("/test-pdf") ||
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
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";

    const callbackUrl = `${pathname}${search || ""}`;
    loginUrl.searchParams.set("callbackUrl", callbackUrl);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\.).*)"],
};