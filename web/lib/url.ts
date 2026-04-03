import { headers } from "next/headers";

export async function getBaseUrl() {
  const url =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://app.dig-ops.com";

  return url.replace(/\/$/, "");
}