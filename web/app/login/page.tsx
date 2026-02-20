import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import LoginClient from "./LoginClient";

export default async function LoginPage() {
  const session = (await getServerSession(authOptions as any)) as any;
  const email = session?.user?.email;

  // Ako je već ulogovan, nema šta da traži na /login
  if (email) redirect("/");

  // Ako NIJE ulogovan, prikaži formu
  return <LoginClient />;
}