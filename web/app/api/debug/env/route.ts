import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    has_NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    len_NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET?.length ?? 0,
    has_AUTH_SECRET: !!process.env.AUTH_SECRET,
    len_AUTH_SECRET: process.env.AUTH_SECRET?.length ?? 0,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
  });
}
