import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function CoreAdminLayout({ children }: { children: React.ReactNode }) {
  const session = (await getServerSession(authOptions as any)) as any;
  const email = session?.user?.email;

  if (!email) redirect("/login");

  const me = await db.user.findUnique({
    where: { email: String(email) },
    select: { isSuperAdmin: true },
  });

  if (!me?.isSuperAdmin) redirect("/"); // ili /og/ghg

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 280, padding: 16, borderRight: "1px solid rgba(255,255,255,0.1)" }}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Core Admin</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Link href="/core-admin">Overview</Link>
          <Link href="/core-admin/tenants">Tenants</Link>
          <Link href="/core-admin/licensing">Licensing</Link>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: 24 }}>{children}</main>
    </div>
  );
}