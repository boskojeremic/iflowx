import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);

  // već ulogovan → vodi na glavnu (dashboard u app/page.tsx)
  if (session) redirect("/");

  return <LoginClient />;
}
