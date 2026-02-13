import { db } from "@/lib/db";

export async function requireAdmin(tenantId: string, userId: string) {
  const m = await db.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { role: true, status: true },
  });

  if (!m || m.status !== "ACTIVE") return false;
  return m.role === "OWNER" || m.role === "ADMIN";
}
