import { db } from "@/lib/db";

export async function getLicenseStatusForUser(userId: string) {
  // uzmi aktivni membership (ako ima više, uzmi najskoriji)
  const m = await db.membership.findFirst({
    where: { userId, status: "ACTIVE" },
    orderBy: { createdAt: "desc" },
    select: {
      role: true,
      tenant: { select: { id: true, name: true, code: true } },
    },
  });

  return m
    ? {
        tenant: m.tenant,
        role: m.role,
      }
    : null;
}