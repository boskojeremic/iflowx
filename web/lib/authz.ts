import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;

  return db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, isSuperAdmin: true },
  });
}

export async function requireTenantAdmin(tenantId: string, userId: string) {
  const m = await db.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true, status: true },
  });

  if (!m || m.status !== "ACTIVE") return false;
  return m.role === "OWNER" || m.role === "ADMIN";
}
