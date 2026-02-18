import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const session = await getServerSession(authOptions as any);

  // redirect samo ako ima user email (realno ulogovan)
  if ((session as any)?.user?.email) redirect("/");

  return <LoginClient />;
}
